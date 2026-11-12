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
  Printer
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

  const kiraTarikhTamatMC = (hari: number) => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(0, hari - 1));
    return d.toLocaleDateString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
  };

  // =========================================================================
  // CETAKAN RESIT THERMAL 58MM (DIKUNCI PADA 38MM SUPAYA MUAT 100% TANPA POTONG)
  // =========================================================================
  const cetakResitThermal58mm = (resit: ResitCetak) => {
    if (!resit || typeof document === 'undefined') return;

    try {
      const iframeLama = document.getElementById('iframeResitFarmasi58mm');
      if (iframeLama) {
        iframeLama.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'iframeResitFarmasi58mm';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '42mm';
      iframe.style.height = '180mm';
      iframe.style.border = '0';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      const senaraiItemHtml =
        resit.senaraiUbat.length === 0
          ? `<div class="baris">Rawatan Ruqyah Am: <strong>RM 0.00</strong></div>`
          : resit.senaraiUbat
              .map((u) => {
                const hargaUnit = Number(u.harga) || 0;
                const qty = Number(u.kuantiti) || 0;
                const subTotal = hargaUnit * qty;
                return `
                  <div class="item-blok">
                    <div class="item-nama">${u.nama_item}</div>
                    <div class="item-harga">${qty} x RM ${hargaUnit.toFixed(2)} = <strong>RM ${subTotal.toFixed(2)}</strong></div>
                  </div>
                `;
              })
              .join('');

      const htmlResit = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Resit ${resit.noResit}</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: 38mm;
              max-width: 38mm;
              background: #ffffff;
              color: #000000;
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 1mm 1mm 0mm 1mm;
              overflow-x: hidden;
            }
            .center { text-align: center; }
            .left { text-align: left; }
            .tajuk-1 {
              font-size: 9px;
              font-weight: 800;
              line-height: 1.2;
            }
            .tajuk-2 {
              font-size: 11px;
              font-weight: 900;
              line-height: 1.2;
            }
            .subtajuk {
              font-size: 7.5px;
              margin-top: 1px;
              line-height: 1.2;
            }
            .garis {
              border-bottom: 1px dashed #000000;
              margin: 4px 0;
            }
            .baris {
              font-size: 8.5px;
              line-height: 1.3;
              margin-bottom: 2px;
              word-break: break-word;
            }
            .tajuk-seksyen {
              font-size: 8.5px;
              font-weight: 800;
              margin-bottom: 3px;
            }
            .item-blok {
              margin-bottom: 3.5px;
              word-break: break-word;
            }
            .item-nama {
              font-size: 8.5px;
              font-weight: 700;
              line-height: 1.2;
            }
            .item-harga {
              font-size: 8px;
              line-height: 1.25;
              padding-left: 2px;
            }
            .jumlah-besar {
              font-size: 11px;
              font-weight: 900;
              line-height: 1.25;
              margin-bottom: 2px;
            }
            .doa-tajuk {
              font-size: 8.5px;
              font-weight: 800;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .doa-teks {
              font-size: 7.5px;
              font-style: italic;
              line-height: 1.25;
              margin-bottom: 4px;
              word-break: break-word;
            }
            .penutup {
              font-size: 7.5px;
              line-height: 1.25;
            }
            .suapan-kertas {
              height: 22mm;
              padding-top: 14mm;
              font-size: 7px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="tajuk-1">PUSAT RAWATAN ISLAM</div>
            <div class="tajuk-2">DARUL SYIFA'</div>
            <div class="subtajuk">Klinik Pengubatan Islam SyifaLink</div>
          </div>
          <div class="garis"></div>

          <div class="left">
            <div class="baris">No. Resit: <strong>${resit.noResit}</strong></div>
            <div class="baris">Tarikh: <strong>${resit.tarikh} ${resit.masa}</strong></div>
            <div class="baris">No. Giliran: <strong>${resit.noGiliran}</strong></div>
            <div class="baris">Pesakit: <strong>${resit.namaPesakit}</strong></div>
            <div class="baris">Tabib: <strong>${resit.namaPerawat}</strong></div>
          </div>
          <div class="garis"></div>

          <div class="left">
            <div class="tajuk-seksyen">ITEM PENAWAR:</div>
            ${senaraiItemHtml}
          </div>
          <div class="garis"></div>

          <div class="left">
            <div class="jumlah-besar">JUMLAH: RM ${resit.jumlahBayaran.toFixed(2)}</div>
            <div class="baris">Kaedah: <strong>${resit.kaedahBayaran}</strong></div>
            ${resit.diberiMc ? `<div class="baris">Cuti Sakit: <strong>${resit.tempohMc} Hari</strong></div>` : ''}
          </div>
          <div class="garis"></div>

          <div class="center">
            <div class="doa-tajuk">Semoga Lekas Sembuh</div>
            <div class="doa-teks">"Kami mendoakan agar anda lekas sembuh, dipermudahkan segala urusan dan sentiasa berada dalam perlindungan-Nya."</div>
            <div class="penutup">
              Terima kasih atas kunjungan anda.<br/>
              <strong>Pusat Rawatan Islam Darul Syifa'</strong>
            </div>
          </div>

          <div class="suapan-kertas">------------------------<br/>.</div>
        </body>
        </html>
      `;

      doc.open();
      doc.write(htmlResit);
      doc.close();

      if (iframe.contentWindow) {
        requestAnimationFrame(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        });
      }
    } catch (err) {
      console.error('Ralat cetakan resit thermal:', err);
    }
  };

  // 2. Fungsi Cetak Sijil Cuti Sakit (MC)
  const tanganiCetakMC = () => {
    if (!pesananDipilih || !pesananDipilih.sesi_rawatan?.diberi_mc) {
      alert('Pesakit ini tidak mempunyai sijil cuti sakit yang dikeluarkan.');
      return;
    }
    setTimeout(() => {
      window.focus();
      window.print();
    }, 200);
  };

  // 3. Selesaikan Bayaran & Cetak Resit Terma 58mm
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
      const tarikhHariIni = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(kini);

      const noResit = `DS-${Date.now().toString().slice(-6)}`;
      const tarikhStr = kini.toLocaleDateString('ms-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const waktuStr = kini.toLocaleTimeString('ms-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: '2-digit',
        minute: '2-digit'
      });

      // A. Rekod Transaksi ke lejar_kewangan (beserta kolum wajib 'kategori')
      if (jumlah > 0) {
        const rekodUtama: any = {
          no_resit: noResit,
          jenis_transaksi: 'masuk',
          kategori: 'Jualan Penawar',
          kaedah_bayaran: kaedahBayaran,
          jumlah: jumlah,
          tarikh: tarikhHariIni
        };

        if (pesananDipilih.pesakit_id) {
          rekodUtama.pesakit_id = pesananDipilih.pesakit_id;
        }

        const { error: errLejar } = await supabase
          .from('lejar_kewangan')
          .insert(rekodUtama);

        if (errLejar) {
          // Sandaran kedua tanpa pesakit_id sekiranya terdapat kekangan kunci asing
          const { pesakit_id, ...rekodTanpaPesakit } = rekodUtama;
          const { error: errFallback } = await supabase
            .from('lejar_kewangan')
            .insert({ ...rekodTanpaPesakit, kategori: 'farmasi' });

          if (errFallback) {
            throw new Error(`Rekod bayaran gagal disimpan (${errFallback.message})`);
          }
        }

        // B. Tolak stok bahan_penawar & rekod log inventori
        const ubatList = pesananDipilih.sesi_rawatan?.senarai_ubat || [];
        for (const item of ubatList) {
          if (!item.id) continue;
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

      // D. Tetapkan Data Resit & Cetak Terus
      const dataResit: ResitCetak = {
        noResit,
        tarikh: tarikhStr,
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
      cetakResitThermal58mm(dataResit);

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
          GAYA CETAKAN SIJIL MC RASMI (A5)
         ======================================================== */}
      <style dangerouslySetInnerHTML={{ __html: `
        #pos-mc-area {
          display: none;
        }

        @media print {
          @page {
            size: A5 portrait;
            margin: 12mm 15mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
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
        }
      `}} />

      {/* ========================================================
          DOKUMEN SIJIL CUTI SAKIT RASMI (MC CETAKAN)
         ======================================================== */}
      {pesananDipilih && pesananDipilih.sesi_rawatan?.diberi_mc && (
        <div id="pos-mc-area">
          <div style={{ border: '2px solid #0f172a', padding: '16px 20px', borderRadius: '4px' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '15pt', fontWeight: 700, color: '#0f172a', letterSpacing: '0.5px' }}>
                PUSAT RAWATAN ISLAM DARUL SYIFA&apos;
              </div>
              <div style={{ fontSize: '9pt', color: '#475569', marginTop: '2px' }}>
                Sijil Perakuan Rawatan &amp; Cuti Sakit (Medical Certificate)
              </div>
              <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '3px' }}>
                SyifaLink Healthcare Management System
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <div>
                <strong>No. Rujukan MC:</strong> MC-{pesananDipilih.no_giliran}-{Date.now().toString().slice(-4)}
              </div>
              <div>
                <strong>Tarikh Rawatan:</strong> {new Date().toLocaleDateString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
              </div>
            </div>

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
                Telah hadir mendapatkan rawatan perubatan Islam / Ruqyah Syar&apos;iyyah di pusat rawatan ini. Beliau didapati <strong>tidak sihat dan memerlukan rehat</strong> daripada menjalankan tugas rasmi / pembelajaran selama:
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
                  Bermula pada <strong>{new Date().toLocaleDateString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</strong> hingga <strong>{kiraTarikhTamatMC(pesananDipilih.sesi_rawatan.tempoh_mc_hari || 1)}</strong>
                </div>
              </div>

              {pesananDipilih.sesi_rawatan.catatan_rawatan && (
                <div style={{ fontSize: '8.5pt', color: '#475569', fontStyle: 'italic', marginTop: '6px' }}>
                  Catatan Tabib: {pesananDipilih.sesi_rawatan.catatan_rawatan}
                </div>
              )}
            </div>

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
                  Perawat Bertauliah Darul Syifa&apos;
                </div>
                <div style={{ fontSize: '7.5pt', color: '#94a3b8' }}>
                  (Tandatangan &amp; Cop Rasmi)
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={22} /> Kaunter Farmasi &amp; Pembayaran
              </h1>
              <p style={{ margin: '0.15rem 0 0 0', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 400 }}>
                Pantau bungkusan penawar ruqyah, bantuan kerusi roda &amp; kutipan bayaran
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {resitUntukCetak && (
                <button
                  type="button"
                  onClick={() => cetakResitThermal58mm(resitUntukCetak)}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.45rem',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Printer size={13} /> Cetak Semula Resit ({resitUntukCetak.noResit})
                </button>
              )}

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
                Pesanan akan muncul di sini sebaik sahaja tabib menekan butang &quot;Hantar ke Farmasi&quot;.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
              {/* SENARAI TIKET MENUNGGU (KIRI) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Senarai Tiket Menunggu ({senaraiPesanan.length})
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
                          {item.no_giliran}
                        </span>
                        {item.perlu_kerusi_roda && (
                          <span style={{ fontSize: '0.8rem' }} title="Pesakit Kerusi Roda">♿</span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.pesakit?.nama || 'Pesakit Am'}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tabib: {item.perawat?.nama?.split(' ')[0] || '-'}</span>
                        <strong style={{ color: jumlahUbat > 0 ? '#34d399' : '#64748b', fontWeight: 500 }}>
                          {jumlahUbat} Penawar
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
                        {pesananDipilih.no_giliran}
                      </span>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f1f5f9', margin: '0.35rem 0 0.15rem 0' }}>
                        {pesananDipilih.pesakit?.nama || 'Pesakit Am'}
                      </h2>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '0.85rem' }}>
                        <span>IC: {pesananDipilih.pesakit?.no_ic || '-'}</span>
                        <span>Tel: {pesananDipilih.pesakit?.no_telefon || '-'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Dirawat Oleh:</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#38bdf8' }}>
                        {pesananDipilih.perawat?.nama || 'Tabib Bertugas'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {pesananDipilih.perawat?.no_bilik || 'Bilik Rawatan'}
                      </div>
                    </div>
                  </div>

                  {/* REAKSI RUQYAH & KAD MC BESERTA BUTANG CETAK MC */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '0.7rem', borderRadius: '0.45rem', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>Dapatan / Reaksi Ruqyah</div>
                      <div style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 400, marginTop: '0.2rem' }}>
                        {Array.isArray(pesananDipilih.sesi_rawatan?.reaksi_rawatan) && pesananDipilih.sesi_rawatan.reaksi_rawatan.length > 0
                          ? pesananDipilih.sesi_rawatan.reaksi_rawatan.join(', ')
                          : pesananDipilih.sesi_rawatan?.dapatan_gangguan || 'Tiada maklumat direkodkan'}
                      </div>
                    </div>

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
                            Sijil Cuti Sakit (MC)
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#f1f5f9', fontWeight: 500, marginTop: '0.15rem' }}>
                            Diberikan: {pesananDipilih.sesi_rawatan.tempoh_mc_hari} Hari
                          </div>
                        </div>

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
                      <Package size={15} /> Senarai Penawar Yang Ditetapkan
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
                              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#f1f5f9' }}>{u.nama_item}</div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                RM {Number(u.harga).toFixed(2)} × {u.kuantiti} unit
                              </div>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#34d399' }}>
                              RM {(Number(u.harga) * Number(u.kuantiti)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* KAEDAH BAYARAN & PENGESAHAN */}
                  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.6rem', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#94a3b8' }}>Jumlah Perlu Dibayar:</span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 600, color: '#34d399' }}>
                        RM {jumlahBayaran.toFixed(2)}
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
                        <Banknote size={14} /> Tunai (Cash)
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
                        <CreditCard size={14} /> DuitNow QR
                      </button>
                    </div>

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
                          <div style={{ fontWeight: 500 }}>Imbasan DuitNow QR Aktif</div>
                          <span style={{ color: '#94a3b8' }}>
                            Minta pesakit imbas QR kaunter dan sahkan penerimaan bayaran pada skrin telefon atau DuitNow Soundbox.
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
                      <CheckCircle size={17} /> Selesai Serah Ubat &amp; Terima Bayaran (Cetak Resit)
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