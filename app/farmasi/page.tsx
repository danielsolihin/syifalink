// app/farmasi/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Package,
  CheckCircle,
  CreditCard,
  Banknote,
  RefreshCw,
  QrCode,
  Printer,
  FileCheck
} from 'lucide-react';

interface ItemPesananFarmasi {
  id: string;
  no_giliran: string;
  pesakit_id: string;
  perawat_id: string | null;
  waktu_panggil: string | null;
  perlu_kerusi_roda?: boolean;
  pesakit?: {
    nama: string;
    no_ic: string;
    no_telefon: string;
    alamat?: string;
  };
  perawat?: {
    nama: string;
    no_bilik: string;
  };
  sesi_rawatan?: {
    id: string;
    senarai_ubat: {
      id: string;
      nama_item: string;
      harga: number;
      kuantiti: number;
    }[];
    catatan_rawatan?: string;
    dapatan_gangguan?: string;
    reaksi_rawatan?: string[];
    diberi_mc?: boolean;
    tempoh_mc_hari?: number;
  };
}

interface ResitCetak {
  noResit: string;
  tarikh: string;
  masa: string;
  noGiliran: string;
  namaPesakit: string;
  noIc: string;
  namaPerawat: string;
  kaedahBayaran: string;
  senaraiUbat: {
    nama_item: string;
    harga: number;
    kuantiti: number;
  }[];
  jumlahBayaran: number;
  diberiMc: boolean;
  tempohMc: number;
}

export default function KaunterFarmasi() {
  const [senaraiPesanan, setSenaraiPesanan] = useState<ItemPesananFarmasi[]>([]);
  const [pesananDipilih, setPesananDipilih] = useState<ItemPesananFarmasi | null>(null);
  const [kaedahBayaran, setKaedahBayaran] = useState<'tunai' | 'duitnow_qr'>('tunai');
  const [memproses, setMemproses] = useState(false);
  const [sedangMemuat, setSedangMemuat] = useState(true);

  // Mod Cetakan: 'resit' atau 'mc'
  const [modCetak, setModCetak] = useState<'resit' | 'mc'>('resit');
  const [resitUntukCetak, setResitUntukCetak] = useState<ResitCetak | null>(null);

  // 1. Muat Data Pesakit di Kaunter Farmasi
  const muatDataFarmasi = async () => {
    try {
      const { data: dataGiliran, error: errGiliran } = await supabase
        .from('giliran')
        .select('*, pesakit(id, nama, no_ic, no_telefon, alamat), perawat(id, nama, no_bilik)')
        .eq('status', 'farmasi')
        .order('created_at', { ascending: true });

      if (errGiliran) throw errGiliran;

      if (!dataGiliran || dataGiliran.length === 0) {
        setSenaraiPesanan([]);
        setPesananDipilih(null);
        setSedangMemuat(false);
        return;
      }

      const giliranIds = dataGiliran.map((g) => g.id);
      const pesakitIds = dataGiliran.map((g) => g.pesakit_id);

      const { data: dataSesi } = await supabase
        .from('sesi_rawatan')
        .select('*')
        .or(`giliran_id.in.(${giliranIds.join(',')}),pesakit_id.in.(${pesakitIds.join(',')})`)
        .order('created_at', { ascending: false });

      const gabungan: ItemPesananFarmasi[] = dataGiliran.map((g) => {
        const sesi = dataSesi?.find(
          (s) => s.giliran_id === g.id || String(s.pesakit_id) === String(g.pesakit_id)
        );

        let parsedUbat = [];
        if (sesi && sesi.senarai_ubat) {
          parsedUbat = Array.isArray(sesi.senarai_ubat)
            ? sesi.senarai_ubat
            : typeof sesi.senarai_ubat === 'string'
            ? JSON.parse(sesi.senarai_ubat)
            : [];
        }

        return {
          id: g.id,
          no_giliran: g.no_giliran,
          pesakit_id: g.pesakit_id,
          perawat_id: g.perawat_id,
          waktu_panggil: g.waktu_panggil,
          perlu_kerusi_roda: Boolean(g.perlu_kerusi_roda),
          pesakit: g.pesakit,
          perawat: g.perawat,
          sesi_rawatan: sesi
            ? {
                ...sesi,
                senarai_ubat: parsedUbat
              }
            : undefined
        };
      });

      setSenaraiPesanan(gabungan);

      setPesananDipilih((prev) => {
        if (!prev) return gabungan[0] || null;
        const masihAda = gabungan.find((item) => item.id === prev.id);
        return masihAda || gabungan[0] || null;
      });
    } catch (err) {
      console.error('Ralat muat data farmasi:', err);
    } finally {
      setSedangMemuat(false);
    }
  };

  useEffect(() => {
    muatDataFarmasi();
    const pemasa = setInterval(muatDataFarmasi, 3000);

    const saluran = supabase
      .channel('farmasi_sync_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giliran' }, () => muatDataFarmasi())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesi_rawatan' }, () => muatDataFarmasi())
      .subscribe();

    return () => {
      clearInterval(pemasa);
      supabase.removeChannel(saluran);
    };
  }, []);

  const kiraJumlahBayaran = () => {
    if (!pesananDipilih || !pesananDipilih.sesi_rawatan) return 0;
    const ubat = pesananDipilih.sesi_rawatan.senarai_ubat || [];
    return ubat.reduce((acc, item) => acc + (Number(item.harga) || 0) * (Number(item.kuantiti) || 0), 0);
  };

  // Kiraan Tarikh Tamat Cuti MC
  const kiraTarikhTamatMC = (hari: number) => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(0, hari - 1));
    return d.toLocaleDateString('ms-MY');
  };

  // 2. Fungsi Cetak Sijil Cuti Sakit (MC)
  const tanganiCetakMC = () => {
    if (!pesananDipilih || !pesananDipilih.sesi_rawatan?.diberi_mc) {
      alert('Pesakit ini tidak mempunyai sijil cuti sakit yang dikeluarkan.');
      return;
    }
    setModCetak('mc');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // 3. Selesaikan Bayaran & Cetak Resit Terma
  const selesaikanPesanan = async () => {
    if (!pesananDipilih) return;

    const jumlah = kiraJumlahBayaran();
    const sah = window.confirm(
      `Sahkan penerimaan bayaran sebanyak RM ${jumlah.toFixed(2)} (${
        kaedahBayaran === 'tunai' ? 'Tunai' : 'DuitNow QR'
      }) untuk pesakit ${pesananDipilih.no_giliran}?`
    );

    if (!sah) return;

    setMemproses(true);
    try {
      const kini = new Date();
      const tarikhHariIni = kini.toISOString().split('T')[0];
      const noResit = `DS-${Date.now().toString().slice(-6)}`;
      const waktuStr = kini.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

      // A. Rekod Transaksi ke lejar_kewangan
      if (jumlah > 0) {
        await supabase.from('lejar_kewangan').insert({
          no_resit: noResit,
          pesakit_id: pesananDipilih.pesakit_id,
          jenis_transaksi: 'masuk',
          kaedah_bayaran: kaedahBayaran,
          jumlah: jumlah,
          tarikh: tarikhHariIni,
          keterangan: `Bayaran penawar rawatan - ${pesananDipilih.no_giliran}`
        });

        // B. Tolak stok bahan_penawar & rekod log inventori
        const ubatList = pesananDipilih.sesi_rawatan?.senarai_ubat || [];
        for (const item of ubatList) {
          const { data: bahanSemasa } = await supabase
            .from('bahan_penawar')
            .select('stok_semasa')
            .eq('id', item.id)
            .maybeSingle();

          if (bahanSemasa) {
            const bakiBaru = Math.max(0, (bahanSemasa.stok_semasa || 0) - item.kuantiti);
            await supabase.from('bahan_penawar').update({ stok_semasa: bakiBaru }).eq('id', item.id);

            await supabase.from('inventori_log').insert({
              bahan_id: item.id,
              jenis_pergerakan: 'keluar',
              kuantiti: item.kuantiti,
              baki_selepas: bakiBaru,
              catatan: `Jualan kaunter rawatan ${pesananDipilih.no_giliran}`
            });
          }
        }
      }

      // C. Kemaskini status sesi_rawatan & giliran
      if (pesananDipilih.sesi_rawatan?.id) {
        await supabase
          .from('sesi_rawatan')
          .update({ status_bayaran: 'selesai' })
          .eq('id', pesananDipilih.sesi_rawatan.id);
      }

      await supabase
        .from('giliran')
        .update({ status: 'selesai' })
        .eq('id', pesananDipilih.id);

      // D. Tetapkan Data Resit & Cetak
      const dataResit: ResitCetak = {
        noResit,
        tarikh: kini.toLocaleDateString('ms-MY'),
        masa: waktuStr,
        noGiliran: pesananDipilih.no_giliran,
        namaPesakit: pesananDipilih.pesakit?.nama || 'Pesakit Am',
        noIc: pesananDipilih.pesakit?.no_ic || '-',
        namaPerawat: pesananDipilih.perawat?.nama || 'Tabib Bertugas',
        kaedahBayaran: kaedahBayaran === 'tunai' ? 'Tunai (Cash)' : 'DuitNow QR',
        senaraiUbat: pesananDipilih.sesi_rawatan?.senarai_ubat || [],
        jumlahBayaran: jumlah,
        diberiMc: Boolean(pesananDipilih.sesi_rawatan?.diberi_mc),
        tempohMc: pesananDipilih.sesi_rawatan?.tempoh_mc_hari || 0
      };

      setResitUntukCetak(dataResit);
      setModCetak('resit');

      setTimeout(() => {
        window.print();
      }, 300);

      await muatDataFarmasi();
    } catch (err: any) {
      alert('Ralat memproses pesanan: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const jumlahBayaran = kiraJumlahBayaran();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b1120', color: '#f1f5f9', fontFamily: 'inherit' }}>
      {/* ========================================================
          GAYA CETAKAN DWIFUNGSI: RESIT TERMA POS & SIJIL MC A4
         ======================================================== */}
      <style dangerouslySetInnerHTML={{ __html: `
        #pos-receipt-area, #pos-mc-area {
          display: none;
        }

        @media print {
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }

          /* JIKA MOD CETAKAN RESIT POS (78MM) */
          ${modCetak === 'resit' ? `
            @page {
              margin: 0;
              size: auto;
            }
            #pos-receipt-area {
              display: block !important;
              width: 74mm !important;
              margin: 0 auto !important;
              padding: 5mm 3mm !important;
              color: #000000 !important;
              background-color: #ffffff !important;
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
            }
            #pos-mc-area {
              display: none !important;
            }
          ` : ''}

          /* JIKA MOD CETAKAN SIJIL MC RASMI (A4 / STANDARD) */
          ${modCetak === 'mc' ? `
            @page {
              size: A5 portrait;
              margin: 12mm 15mm;
            }
            #pos-mc-area {
              display: block !important;
              width: 100% !important;
              color: #0f172a !important;
              background-color: #ffffff !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
              font-size: 10.5pt !important;
              line-height: 1.5 !important;
            }
            #pos-receipt-area {
              display: none !important;
            }
          ` : ''}
        }
      `}} />

      {/* ========================================================
          DOKUMEN 1: RESIT TERMA POS (HANYA AKTIF JIKA MOD RESIT)
         ======================================================== */}
      {resitUntukCetak && (
        <div id="pos-receipt-area">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>PUSAT RAWATAN ISLAM</div>
            <div style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px' }}>DARUL SYIFA'</div>
            <div style={{ fontSize: '10px' }}>Klinik Pengubatan Islam SyifaLink</div>
            <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No. Resit:</span>
              <span style={{ fontWeight: 600 }}>{resitUntukCetak.noResit}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tarikh:</span>
              <span>{resitUntukCetak.tarikh} {resitUntukCetak.masa}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No. Giliran:</span>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{resitUntukCetak.noGiliran}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Pesakit:</span>
              <span>{resitUntukCetak.namaPesakit}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tabib:</span>
              <span>{resitUntukCetak.namaPerawat}</span>
            </div>
            <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>ITEM PENAWAR:</div>
            {resitUntukCetak.senaraiUbat.length === 0 ? (
              <div>Rawatan Ruqyah Am (RM 0.00)</div>
            ) : (
              resitUntukCetak.senaraiUbat.map((u, i) => (
                <div key={i} style={{ marginBottom: '3px' }}>
                  <div>{u.nama_item}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', color: '#222' }}>
                    <span>{u.kuantiti} x RM {Number(u.harga).toFixed(2)}</span>
                    <span>RM {(Number(u.harga) * Number(u.kuantiti)).toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
            <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
              <span>JUMLAH:</span>
              <span>RM {resitUntukCetak.jumlahBayaran.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span>Kaedah:</span>
              <span>{resitUntukCetak.kaedahBayaran}</span>
            </div>
            {resitUntukCetak.diberiMc && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
                <span>Cuti Sakit:</span>
                <span>{resitUntukCetak.tempohMc} Hari</span>
              </div>
            )}
            <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '8px', padding: '0 2px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase' }}>
              Semoga Lekas Sembuh
            </div>
            <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '5px' }}>
              "Kami mendoakan agar anda lekas sembuh, dipermudahkan segala urusan dan sentiasa berada dalam perlindungan-Nya."
            </div>
            <div style={{ fontSize: '8.5px', color: '#555' }}>
              Terima kasih atas kunjungan anda.<br />
              Pusat Rawatan Islam Darul Syifa'
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DOKUMEN 2: SIJIL CUTI SAKIT RASMI (MC CETAKAN)
         ======================================================== */}
      {pesananDipilih && pesananDipilih.sesi_rawatan?.diberi_mc && (
        <div id="pos-mc-area">
          <div style={{ border: '2px solid #0f172a', padding: '16px 20px', borderRadius: '4px' }}>
            {/* KEPALA SURAT KLINIK */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '15pt', fontWeight: 700, color: '#0f172a', letterSpacing: '0.5px' }}>
                PUSAT RAWATAN ISLAM DARUL SYIFA'
              </div>
              <div style={{ fontSize: '9pt', color: '#475569', marginTop: '2px' }}>
                Sijil Perakuan Rawatan & Cuti Sakit (Medical Certificate)
              </div>
              <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '3px' }}>
                SyifaLink Healthcare Management System
              </div>
            </div>

            {/* BUTIRAN NO SIRI & TARIKH */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <div>
                <strong>No. Rujukan MC:</strong> MC-{pesananDipilih.no_giliran}-{Date.now().toString().slice(-4)}
              </div>
              <div>
                <strong>Tarikh Rawatan:</strong> {new Date().toLocaleDateString('ms-MY')}
              </div>
            </div>

            {/* KANDUNGAN PENGESAHAN MC */}
            <div style={{ fontSize: '10pt', lineHeight: '1.6', marginBottom: '16px', color: '#1e293b' }}>
              <p style={{ margin: '0 0 10px 0' }}>Dengan ini diperakui bahawa:</p>
              
              <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '150px', padding: '3px 0', color: '#475569' }}>Nama Pesakit:</td>
                    <td style={{ padding: '3px 0', fontWeight: 600, color: '#0f172a' }}>{pesananDipilih.pesakit?.nama || 'Pesakit Am'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', color: '#475569' }}>No. Kad Pengenalan:</td>
                    <td style={{ padding: '3px 0', fontWeight: 600, color: '#0f172a' }}>{pesananDipilih.pesakit?.no_ic || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', color: '#475569' }}>No. Giliran:</td>
                    <td style={{ padding: '3px 0', fontWeight: 600, color: '#0f172a' }}>{pesananDipilih.no_giliran}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ margin: '0 0 10px 0' }}>
                Telah hadir mendapatkan rawatan perubatan Islam / Ruqyah Syar'iyyah di pusat rawatan ini. Beliau didapati <strong>tidak sihat dan memerlukan rehat</strong> daripada menjalankan tugas rasmi / pembelajaran selama:
              </p>

              <div style={{ 
                backgroundColor: '#f8fafc', 
                border: '1.5px solid #cbd5e1', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                margin: '12px 0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13pt', fontWeight: 700, color: '#0f172a' }}>
                  {pesananDipilih.sesi_rawatan.tempoh_mc_hari || 1} HARI
                </div>
                <div style={{ fontSize: '9pt', color: '#475569', marginTop: '4px' }}>
                  Bermula pada <strong>{new Date().toLocaleDateString('ms-MY')}</strong> hingga <strong>{kiraTarikhTamatMC(pesananDipilih.sesi_rawatan.tempoh_mc_hari || 1)}</strong>
                </div>
              </div>

              {pesananDipilih.sesi_rawatan.catatan_rawatan && (
                <div style={{ fontSize: '8.5pt', color: '#475569', fontStyle: 'italic', marginTop: '6px' }}>
                  Catatan Tabib: {pesananDipilih.sesi_rawatan.catatan_rawatan}
                </div>
              )}
            </div>

            {/* RUANGAN PENGESAHAN TABIB */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '28px', paddingTop: '10px' }}>
              <div style={{ fontSize: '8pt', color: '#64748b', maxWidth: '240px' }}>
                * Surat perakuan ini dikeluarkan atas dasar rawatan klinikal ruqyah untuk makluman majikan / institusi berkaitan.
              </div>

              <div style={{ textAlign: 'center', width: '180px' }}>
                <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '4px', height: '40px' }}></div>
                <div style={{ fontWeight: 600, fontSize: '9.5pt', color: '#0f172a' }}>
                  {pesananDipilih.perawat?.nama || 'Tabib Bertugas'}
                </div>
                <div style={{ fontSize: '8pt', color: '#475569' }}>
                  Perawat Bertauliah Darul Syifa'
                </div>
                <div style={{ fontSize: '7.5pt', color: '#94a3b8' }}>
                  (Tandatangan & Cop Rasmi)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PAPARAN KONSOL SKRIN FARMASI (DISEMBUNYIKAN SEMASA PRINT)
         ======================================================== */}
      <div className="no-print" style={{ padding: '1.25rem 1.5rem', maxWidth: '1240px', margin: '0 auto' }}>
        {/* HEADER ATAS */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Link href="/" style={{ color: '#64748b', fontSize: '0.82rem', textDecoration: 'none' }}>
            ← Menu Utama
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={22} /> Kaunter Farmasi & Pembayaran
              </h1>
              <p style={{ margin: '0.15rem 0 0 0', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 400 }}>
                Pantau bungkusan penawar ruqyah, bantuan kerusi roda & kutipan bayaran
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                onClick={muatDataFarmasi}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #334155',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.45rem',
                  fontWeight: 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <RefreshCw size={13} /> Segar Semula
              </button>

              <span style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '0.3rem 0.75rem',
                borderRadius: '1.5rem',
                fontWeight: 600,
                fontSize: '0.78rem'
              }}>
                Pesanan Menunggu: {senaraiPesanan.length}
              </span>
            </div>
          </div>
        </div>

        {/* KANDUNGAN UTAMA */}
        <div>
          {sedangMemuat ? (
            <div style={{ textAlign: 'center', padding: '4.5rem 0', color: '#64748b', fontSize: '0.85rem' }}>
              Memuatkan pesanan farmasi...
            </div>
          ) : senaraiPesanan.length === 0 ? (
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px dashed #334155',
              borderRadius: '0.85rem',
              padding: '4rem 2rem',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <Package size={44} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0, color: '#cbd5e1' }}>
                Tiada pesanan penawar aktif buat masa ini.
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem' }}>
                Pesanan akan muncul di sini sebaik sahaja tabib menekan butang "Hantar ke Farmasi".
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
              {/* SENARAI TIKET MENUNGGU (KIRI) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Senarai Tiket Menunggu ({senaraiPesanan.length})[cite: 14]
                </div>

                {senaraiPesanan.map((item) => {
                  const dipilih = pesananDipilih?.id === item.id;
                  const jumlahUbat = item.sesi_rawatan?.senarai_ubat?.length || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setPesananDipilih(item)}
                      style={{
                        backgroundColor: dipilih ? '#1e293b' : '#0f172a',
                        border: dipilih ? '1.5px solid #f59e0b' : '1px solid #1e293b',
                        borderRadius: '0.6rem',
                        padding: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 600, fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '0.3rem' }}>
                          {item.no_giliran}[cite: 14]
                        </span>
                        {item.perlu_kerusi_roda && (
                          <span style={{ fontSize: '0.8rem' }} title="Pesakit Kerusi Roda">♿</span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.pesakit?.nama || 'Pesakit Am'}[cite: 14]
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tabib: {item.perawat?.nama?.split(' ')[0] || '-'}[cite: 14]</span>
                        <strong style={{ color: jumlahUbat > 0 ? '#34d399' : '#64748b', fontWeight: 500 }}>
                          {jumlahUbat} Penawar[cite: 14]
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BUTIRAN PESANAN (KANAN) */}
              {pesananDipilih && (
                <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* HEADER PESAKIT */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
                    <div>
                      <span style={{ backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 600, fontSize: '0.8rem', padding: '0.18rem 0.6rem', borderRadius: '0.3rem' }}>
                        {pesananDipilih.no_giliran}[cite: 14]
                      </span>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f1f5f9', margin: '0.35rem 0 0.15rem 0' }}>
                        {pesananDipilih.pesakit?.nama || 'Pesakit Am'}[cite: 14]
                      </h2>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '0.85rem' }}>
                        <span>IC: {pesananDipilih.pesakit?.no_ic || '-'}[cite: 14]</span>
                        <span>Tel: {pesananDipilih.pesakit?.no_telefon || '-'}[cite: 14]</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Dirawat Oleh:[cite: 14]</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#38bdf8' }}>
                        {pesananDipilih.perawat?.nama || 'Tabib Bertugas'}[cite: 14]
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {pesananDipilih.perawat?.no_bilik || 'Bilik Rawatan'}
                      </div>
                    </div>
                  </div>

                  {/* REAKSI RUQYAH & KAD MC BESERTA BUTANG CETAK MC */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '0.7rem', borderRadius: '0.45rem', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>Dapatan / Reaksi Ruqyah[cite: 14]</div>
                      <div style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 400, marginTop: '0.2rem' }}>
                        {Array.isArray(pesananDipilih.sesi_rawatan?.reaksi_rawatan) && pesananDipilih.sesi_rawatan.reaksi_rawatan.length > 0
                          ? pesananDipilih.sesi_rawatan.reaksi_rawatan.join(', ')
                          : pesananDipilih.sesi_rawatan?.dapatan_gangguan || 'Tiada maklumat direkodkan'}[cite: 14]
                      </div>
                    </div>

                    {/* KAD MC BESERTA BUTANG CETAK */}
                    {pesananDipilih.sesi_rawatan?.diberi_mc && (
                      <div style={{ 
                        backgroundColor: '#1e293b', 
                        padding: '0.7rem 0.85rem', 
                        borderRadius: '0.45rem', 
                        border: '1px solid #a855f7',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 500, textTransform: 'uppercase' }}>
                            Sijil Cuti Sakit (MC)[cite: 14]
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 500, marginTop: '0.15rem' }}>
                            Diberikan: {pesananDipilih.sesi_rawatan.tempoh_mc_hari} Hari[cite: 14]
                          </div>
                        </div>

                        {/* BUTANG CETAK SIJIL MC */}
                        <button
                          type="button"
                          onClick={tanganiCetakMC}
                          style={{
                            backgroundColor: '#7c3aed',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.35rem',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s'
                          }}
                          title="Cetak Surat Perakuan Cuti Sakit Rasmi"
                        >
                          <Printer size={12} /> Cetak Sijil MC
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SENARAI PENAWAR */}
                  <div>
                    <h3 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', margin: '0 0 0.45rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Package size={15} /> Senarai Penawar Yang Ditetapkan[cite: 14]
                    </h3>

                    {(!pesananDipilih.sesi_rawatan?.senarai_ubat || pesananDipilih.sesi_rawatan.senarai_ubat.length === 0) ? (
                      <div style={{ padding: '0.85rem', backgroundColor: '#1e293b', borderRadius: '0.45rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                        Tiada ubat penawar fizikal dicadangkan (Rawatan Doa Sahaja).
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {pesananDipilih.sesi_rawatan.senarai_ubat.map((u, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#1e293b',
                              padding: '0.6rem 0.8rem',
                              borderRadius: '0.4rem',
                              border: '1px solid #334155'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#f1f5f9' }}>{u.nama_item}[cite: 14]</div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                RM {Number(u.harga).toFixed(2)} × {u.kuantiti} unit[cite: 14]
                              </div>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#34d399' }}>
                              RM {(Number(u.harga) * Number(u.kuantiti)).toFixed(2)}[cite: 14]
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* KAEDAH BAYARAN & PENGESAHAN */}
                  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#94a3b8' }}>Jumlah Perlu Dibayar:[cite: 14]</span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 600, color: '#34d399' }}>
                        RM {jumlahBayaran.toFixed(2)}[cite: 14]
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => setKaedahBayaran('tunai')}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: kaedahBayaran === 'tunai' ? '#059669' : '#0f172a',
                          border: kaedahBayaran === 'tunai' ? '1.5px solid #34d399' : '1px solid #334155',
                          borderRadius: '0.4rem',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Banknote size={14} /> Tunai (Cash)[cite: 14]
                      </button>

                      <button
                        type="button"
                        onClick={() => setKaedahBayaran('duitnow_qr')}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: kaedahBayaran === 'duitnow_qr' ? '#0284c7' : '#0f172a',
                          border: kaedahBayaran === 'duitnow_qr' ? '1.5px solid #38bdf8' : '1px solid #334155',
                          borderRadius: '0.4rem',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <CreditCard size={14} /> DuitNow QR[cite: 14]
                      </button>
                    </div>

                    {/* KOTAK RUJUKAN DUITNOW QR */}
                    {kaedahBayaran === 'duitnow_qr' && (
                      <div style={{
                        backgroundColor: '#0f172a',
                        border: '1px dashed #38bdf8',
                        borderRadius: '0.45rem',
                        padding: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem'
                      }}>
                        <QrCode size={30} color="#38bdf8" />
                        <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                          <div style={{ fontWeight: 500 }}>Imbasan DuitNow QR Aktif[cite: 14]</div>
                          <span style={{ color: '#94a3b8' }}>
                            Minta pesakit imbas QR kaunter dan sahkan penerimaan bayaran pada skrin telefon atau DuitNow Soundbox.[cite: 14]
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={memproses}
                      onClick={selesaikanPesanan}
                      style={{
                        width: '100%',
                        padding: '0.7rem',
                        backgroundColor: '#059669',
                        border: 'none',
                        borderRadius: '0.45rem',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                      }}
                    >
                      <CheckCircle size={17} /> Selesai Serah Ubat & Terima Bayaran (Cetak Resit)[cite: 14]
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}