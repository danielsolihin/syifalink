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
  const [bukaModalQr, setBukaModalQr] = useState(false);

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

  // 2. Cetak Automatik Apabila Resit Sedia Ditjana
  useEffect(() => {
    if (resitUntukCetak) {
      const pemasa = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(pemasa);
    }
  }, [resitUntukCetak]);

  const kiraJumlahBayaran = () => {
    if (!pesananDipilih || !pesananDipilih.sesi_rawatan) return 0;
    const ubat = pesananDipilih.sesi_rawatan.senarai_ubat || [];
    return ubat.reduce((acc, item) => acc + (Number(item.harga) || 0) * (Number(item.kuantiti) || 0), 0);
  };

  // 3. Selesaikan Bayaran & Sedia Data Resit
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

      // D. Tetapkan Data Resit untuk Cetakan Automatik
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
      {/* GAYA CETAKAN POS TERMA (80MM) - KALIS HALAMAN KOSONG */}
      <style dangerouslySetInnerHTML={{ __html: `
        #pos-receipt-area {
          display: none;
        }

        @media print {
          @page {
            margin: 0;
            size: auto;
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
          #pos-receipt-area * {
            color: #000000 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
        }
      `}} />

      {/* STRUKTUR RESIT KHAS CETAKAN (TIADA TEKS ARAB / HADIS) */}
      {resitUntukCetak && (
        <div id="pos-receipt-area">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>PUSAT RAWATAN ISLAM</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.5px' }}>DARUL SYIFA'</div>
            <div style={{ fontSize: '10px' }}>Klinik Pengubatan Islam SyifaLink</div>
            <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No. Resit:</span>
              <strong>{resitUntukCetak.noResit}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tarikh:</span>
              <span>{resitUntukCetak.tarikh} {resitUntukCetak.masa}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No. Giliran:</span>
              <strong style={{ fontSize: '13px' }}>{resitUntukCetak.noGiliran}</strong>
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
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>ITEM PENAWAR:</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
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

          {/* KATA-KATA HARAPAN KESEMBUHAN UMUM */}
          <div style={{ textAlign: 'center', marginTop: '8px', padding: '0 2px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '3px', textTransform: 'uppercase' }}>
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

      {/* PAPARAN KONSOL FARMASI (DISEMBUNYIKAN SEMASA PRINT) */}
      <div className="no-print" style={{ padding: '1.5rem' }}>
        {/* HEADER ATAS */}
        <div style={{ maxWidth: '1200px', margin: '0 auto 1.5rem auto' }}>
          <Link href="/" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Menu Utama
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Package size={24} /> Kaunter Farmasi & Pembayaran
              </h1>
              <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 400 }}>
                Pantau bungkusan penawar ruqyah, bantuan kerusi roda & kutipan bayaran
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {resitUntukCetak && (
                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#34d399',
                    border: '1px solid #059669',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                  title="Cetak semula resit pesakit terakhir"
                >
                  <Printer size={13} /> Cetak Semula Resit
                </button>
              )}

              <button
                onClick={muatDataFarmasi}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #334155',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <RefreshCw size={13} /> Segar Semula
              </button>

              <span style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '0.35rem 0.85rem',
                borderRadius: '2rem',
                fontWeight: 600,
                fontSize: '0.8rem'
              }}>
                Pesanan Menunggu: {senaraiPesanan.length}
              </span>
            </div>
          </div>
        </div>

        {/* KANDUNGAN UTAMA */}
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {sedangMemuat ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748b', fontSize: '0.9rem' }}>
              Memuatkan pesanan farmasi...
            </div>
          ) : senaraiPesanan.length === 0 ? (
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px dashed #334155',
              borderRadius: '1rem',
              padding: '4.5rem 2rem',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <Package size={48} style={{ opacity: 0.3, marginBottom: '0.85rem' }} />
              <p style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: '#cbd5e1' }}>
                Tiada pesanan penawar aktif buat masa ini.
              </p>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem' }}>
                Pesanan akan muncul di sini sebaik sahaja tabib menekan butang "Hantar ke Farmasi".
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
              {/* SENARAI TIKET KIRI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                        borderRadius: '0.65rem',
                        padding: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', padding: '0.2rem 0.55rem', borderRadius: '0.3rem' }}>
                          {item.no_giliran}
                        </span>
                        {item.perlu_kerusi_roda && (
                          <span style={{ fontSize: '0.85rem' }} title="Pesakit Kerusi Roda">♿</span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.pesakit?.nama || 'Pesakit Am'}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tabib: {item.perawat?.nama?.split(' ')[0] || '-'}</span>
                        <strong style={{ color: jumlahUbat > 0 ? '#34d399' : '#64748b', fontWeight: 600 }}>
                          {jumlahUbat} Penawar
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BUTIRAN PESANAN KANAN */}
              {pesananDipilih && (
                <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.85rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {/* HEADER PESAKIT */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '0.85rem' }}>
                    <div>
                      <span style={{ backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', padding: '0.2rem 0.65rem', borderRadius: '0.35rem' }}>
                        {pesananDipilih.no_giliran}
                      </span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', margin: '0.4rem 0 0.2rem 0' }}>
                        {pesananDipilih.pesakit?.nama || 'Pesakit Am'}
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '1rem' }}>
                        <span>IC: {pesananDipilih.pesakit?.no_ic || '-'}</span>
                        <span>Tel: {pesananDipilih.pesakit?.no_telefon || '-'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Dirawat Oleh:</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#38bdf8' }}>
                        {pesananDipilih.perawat?.nama || 'Tabib Bertugas'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {pesananDipilih.perawat?.no_bilik || 'Bilik Rawatan'}
                      </div>
                    </div>
                  </div>

                  {/* DAPATAN RAWATAN & MC */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Dapatan / Reaksi Ruqyah</div>
                      <div style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 500, marginTop: '0.25rem' }}>
                        {Array.isArray(pesananDipilih.sesi_rawatan?.reaksi_rawatan) && pesananDipilih.sesi_rawatan.reaksi_rawatan.length > 0
                          ? pesananDipilih.sesi_rawatan.reaksi_rawatan.join(', ')
                          : pesananDipilih.sesi_rawatan?.dapatan_gangguan || 'Tiada maklumat direkodkan'}
                      </div>
                    </div>

                    {pesananDipilih.sesi_rawatan?.diberi_mc && (
                      <div style={{ backgroundColor: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #a855f7' }}>
                        <div style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 600, textTransform: 'uppercase' }}>Sijil Cuti Sakit (MC)</div>
                        <div style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600, marginTop: '0.25rem' }}>
                          Diberikan: {pesananDipilih.sesi_rawatan.tempoh_mc_hari} Hari
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SENARAI PENAWAR */}
                  <div>
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Package size={16} /> Senarai Penawar Yang Ditetapkan
                    </h3>

                    {(!pesananDipilih.sesi_rawatan?.senarai_ubat || pesananDipilih.sesi_rawatan.senarai_ubat.length === 0) ? (
                      <div style={{ padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                        Tiada ubat penawar fizikal dicadangkan (Rawatan Doa Sahaja).
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {pesananDipilih.sesi_rawatan.senarai_ubat.map((u, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#1e293b',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '0.45rem',
                              border: '1px solid #334155'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>{u.nama_item}</div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                RM {Number(u.harga).toFixed(2)} × {u.kuantiti} unit
                              </div>
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399' }}>
                              RM {(Number(u.harga) * Number(u.kuantiti)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* KAEDAH BAYARAN & PENGESAHAN */}
                  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.65rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94a3b8' }}>Jumlah Perlu Dibayar:</span>
                      <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#34d399' }}>
                        RM {jumlahBayaran.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setKaedahBayaran('tunai');
                          setBukaModalQr(false);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.55rem',
                          backgroundColor: kaedahBayaran === 'tunai' ? '#059669' : '#0f172a',
                          border: kaedahBayaran === 'tunai' ? '1.5px solid #34d399' : '1px solid #334155',
                          borderRadius: '0.45rem',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Banknote size={15} /> Tunai (Cash)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setKaedahBayaran('duitnow_qr');
                          setBukaModalQr(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.55rem',
                          backgroundColor: kaedahBayaran === 'duitnow_qr' ? '#0284c7' : '#0f172a',
                          border: kaedahBayaran === 'duitnow_qr' ? '1.5px solid #38bdf8' : '1px solid #334155',
                          borderRadius: '0.45rem',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <CreditCard size={15} /> DuitNow QR
                      </button>
                    </div>

                    {/* KOTAK RUJUKAN DUITNOW QR */}
                    {kaedahBayaran === 'duitnow_qr' && (
                      <div style={{
                        backgroundColor: '#0f172a',
                        border: '1px dashed #38bdf8',
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <QrCode size={36} color="#38bdf8" />
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <div><strong>Imbasan DuitNow QR Aktif</strong></div>
                          <span style={{ color: '#94a3b8' }}>
                            Minta pesakit imbas kod QR kaunter klinik dan sahkan penerimaan bayaran pada skrin telefon atau DuitNow Soundbox.
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
                        padding: '0.75rem',
                        backgroundColor: '#059669',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#ffffff',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                      }}
                    >
                      <CheckCircle size={18} /> Selesai Terima Bayaran & Serah Ubat (Cetak Resit)
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