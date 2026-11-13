'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  UserCheck, 
  UserPlus, 
  Accessibility, 
  Car, 
  RefreshCw, 
  Stethoscope, 
  Sparkles,
  Printer,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface Perawat {
  id: string;
  nama: string;
  no_bilik: string;
}

interface Pesakit {
  id: string;
  nama: string;
  no_ic: string;
  no_telefon: string;
  alamat?: string;
  perlu_kerusi_roda?: boolean;
  catatan_mobiliti?: string;
}

export default function PendaftaranKiosk() {
  const [carianIC, setCarianIC] = useState('');
  const [sedangSemak, setSedangSemak] = useState(false);

  const [statusSemakan, setStatusSemakan] = useState<'mula' | 'ditemui' | 'baharu'>('mula');
  const [pesakitDitemui, setPesakitDitemui] = useState<Pesakit | null>(null);

  const [nama, setNama] = useState('');
  const [noIC, setNoIC] = useState('');
  const [noTelefon, setNoTelefon] = useState('');
  const [alamat, setAlamat] = useState('');

  const [perluWheelchair, setPerluWheelchair] = useState(false);
  const [noPlatKereta, setNoPlatKereta] = useState('');
  const [catatanMobiliti, setCatatanMobiliti] = useState('Tidak boleh berjalan / Lumpuh');

  const [senaraiPerawat, setSenaraiPerawat] = useState<Perawat[]>([]);
  const [pilihTabibKhusus, setPilihTabibKhusus] = useState(false);
  const [perawatDipilih, setPerawatDipilih] = useState<string>('');

  const [memproses, setMemproses] = useState(false);
  const [tiketSelesai, setTiketSelesai] = useState<any | null>(null);
  const timerTutupRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Muat Senarai Perawat Aktif
  useEffect(() => {
    const muatPerawat = async () => {
      const { data } = await supabase
        .from('perawat')
        .select('*')
        .eq('status_aktif', true)
        .order('id', { ascending: true });

      if (data && data.length > 0) {
        setSenaraiPerawat(data);
        setPerawatDipilih(data[0].id);
      }
    };
    muatPerawat();
  }, []);

  const semakSemula = () => {
    if (timerTutupRef.current) {
      clearTimeout(timerTutupRef.current);
      timerTutupRef.current = null;
    }
    setTiketSelesai(null);
    setStatusSemakan('mula');
    setPesakitDitemui(null);
    setCarianIC('');
    setNama('');
    setNoIC('');
    setNoTelefon('');
    setAlamat('');
    setPerluWheelchair(false);
    setNoPlatKereta('');
    setPilihTabibKhusus(false);
  };

  // Sediakan iframe cetakan lebih awal semasa klik supaya kekal terikat dengan interaksi pengguna
  const sediakanIframeCetak = (): HTMLIFrameElement | null => {
    if (typeof document === 'undefined') return null;

    const iframeLama = document.getElementById('iframeCetakThermal');
    if (iframeLama) {
      iframeLama.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'iframeCetakThermal';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '48mm';
    iframe.style.height = '130mm';
    iframe.style.border = '0';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
    return iframe;
  };

  // 2. Fungsi Cetakan Terus Thermal 58mm (Teks Tengah & Saiz Besar)
  const cetakResitThermal = (tiket: any, iframeSediaAda?: HTMLIFrameElement | null) => {
    if (!tiket || typeof document === 'undefined') return;

    try {
      const iframe = iframeSediaAda || sediakanIframeCetak();
      if (!iframe) return;

      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      const htmlResit = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Tiket ${tiket.no_giliran}</title>
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
              width: 46mm;
              max-width: 46mm;
              background: #ffffff;
              color: #000000;
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 0;
              overflow-x: hidden;
            }
            .resit-wrapper {
              width: 43mm;
              max-width: 43mm;
              margin-left: 0mm;
              margin-right: auto;
              padding: 1.5mm 1mm 0mm 1mm;
              text-align: center;
            }
            .tajuk {
              font-size: 11px;
              font-weight: 900;
              line-height: 1.2;
              text-transform: uppercase;
              margin-bottom: 2px;
              text-align: center;
            }
            .subtajuk {
              font-size: 9px;
              font-weight: 700;
              margin-bottom: 4px;
              text-align: center;
              letter-spacing: 0.03em;
            }
            .nombor-utama {
              font-size: 38px;
              font-weight: 900;
              line-height: 1.05;
              margin: 2px 0 6px 0;
              text-align: center;
              letter-spacing: -0.5px;
            }
            .kotak-wheelchair {
              border: 1.5px dashed #000000;
              padding: 3px 3px;
              font-size: 8.5px;
              font-weight: 800;
              margin-bottom: 5px;
              text-align: center;
              word-break: break-word;
            }
            .maklumat {
              border-top: 1px dashed #000000;
              border-bottom: 1px dashed #000000;
              padding: 5px 0;
              margin-bottom: 5px;
              font-size: 10px;
              line-height: 1.35;
              text-align: center;
            }
            .baris {
              margin-bottom: 2.5px;
              text-align: center;
              word-break: break-word;
            }
            .kotak-sebelum {
              border: 1.5px solid #000000;
              padding: 5px 3px;
              margin-bottom: 5px;
              text-align: center;
            }
            .label-kecil {
              font-size: 9px;
              font-weight: 700;
              text-align: center;
            }
            .nombor-sebelum {
              font-size: 20px;
              font-weight: 900;
              margin: 2px 0;
              text-align: center;
            }
            .nota {
              font-size: 8.5px;
              font-weight: 700;
              line-height: 1.25;
              text-align: center;
            }
            .penutup {
              font-size: 8.5px;
              font-weight: 700;
              line-height: 1.3;
              margin-top: 4px;
              text-align: center;
            }
            .suapan-kertas {
              height: 24mm;
              padding-top: 16mm;
              font-size: 7px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="resit-wrapper">
            <div class="tajuk">PUSAT RAWATAN ISLAM<br/>DARUSSYIFA'</div>
            <div class="subtajuk">SLIP GILIRAN RASMI</div>
            <div class="nombor-utama">${tiket.no_giliran}</div>
            ${
              tiket.perlu_kerusi_roda
                ? `<div class="kotak-wheelchair">KERUSI RODA: ${tiket.no_plat_kereta || 'Drop-Off'}</div>`
                : ''
            }
            <div class="maklumat">
              <div class="baris">Nama: <strong>${tiket.nama}</strong></div>
              ${tiket.perawat_nama ? `<div class="baris">Tabib: <strong>${tiket.perawat_nama}</strong></div>` : ''}
              <div class="baris">Bilik: <strong>${tiket.lokasi}</strong></div>
              <div class="baris">Tarikh: <strong>${tiket.tarikh}</strong></div>
              <div class="baris">Masa: <strong>${tiket.masa}</strong></div>
            </div>
            <div class="kotak-sebelum">
              <div class="label-kecil">No. Terkini Sebelum Anda:</div>
              <div class="nombor-sebelum">${tiket.no_terkini_sebelum}</div>
              <div class="nota">Sila nantikan panggilan di ruang menunggu.</div>
            </div>
            <div class="penutup">Terima Kasih &amp;<br/>Selamat Menjalani Rawatan</div>
            <div class="suapan-kertas">------------------------<br/>.</div>
          </div>
        </body>
        </html>
      `;

      doc.open();
      doc.write(htmlResit);
      doc.close();

      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = () => {
          setTimeout(() => {
            semakSemula();
          }, 600);
        };

        requestAnimationFrame(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        });
      }
    } catch (err) {
      console.error('Ralat penyediaan slip cetakan:', err);
    }
  };

  // 3. Semak No. IC Sahaja
  const tanganiSemakan = async (e: React.FormEvent) => {
    e.preventDefault();
    const bersihIC = carianIC.trim();
    if (!bersihIC) {
      alert('Sila masukkan No. Kad Pengenalan untuk semakan.');
      return;
    }

    setSedangSemak(true);
    try {
      const { data, error } = await supabase
        .from('pesakit')
        .select('*')
        .eq('no_ic', bersihIC)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPesakitDitemui(data);
        setNama(data.nama);
        setNoIC(data.no_ic);
        setNoTelefon(data.no_telefon);
        setAlamat(data.alamat || '');
        setPerluWheelchair(Boolean(data.perlu_kerusi_roda));
        if (data.catatan_mobiliti) setCatatanMobiliti(data.catatan_mobiliti);
        setStatusSemakan('ditemui');
      } else {
        setPesakitDitemui(null);
        setNoIC(bersihIC);
        setNama('');
        setNoTelefon('');
        setAlamat('');
        setPerluWheelchair(false);
        setNoPlatKereta('');
        setStatusSemakan('baharu');
      }
    } catch (err: any) {
      alert('Ralat semakan: ' + err.message);
    } finally {
      setSedangSemak(false);
    }
  };

  // 4. Proses Pendaftaran Giliran & Auto-Print Serta-Merta
  const prosesDaftarDanAutoAksi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nama.trim() || !noIC.trim() || !noTelefon.trim()) {
      alert('Sila pastikan Nama, No. Kad Pengenalan dan No. Telefon telah lengkap.');
      return;
    }

    const iframeCetak = sediakanIframeCetak();

    setMemproses(true);
    try {
      let pesakitId: string;

      const { data: semakSediaAda } = await supabase
        .from('pesakit')
        .select('id')
        .eq('no_ic', noIC.trim())
        .maybeSingle();

      if (pesakitDitemui || semakSediaAda) {
        pesakitId = pesakitDitemui?.id || semakSediaAda!.id;
        const { error: errUpdate } = await supabase
          .from('pesakit')
          .update({
            nama: nama.trim(),
            no_telefon: noTelefon.trim(),
            alamat: alamat.trim() || null,
            perlu_kerusi_roda: perluWheelchair,
            catatan_mobiliti: perluWheelchair ? catatanMobiliti : null
          })
          .eq('id', pesakitId);

        if (errUpdate) throw errUpdate;
      } else {
        const { data: pesakitBaru, error: errPesakit } = await supabase
          .from('pesakit')
          .insert({
            nama: nama.trim(),
            no_ic: noIC.trim(),
            no_telefon: noTelefon.trim(),
            alamat: alamat.trim() || null,
            perlu_kerusi_roda: perluWheelchair,
            catatan_mobiliti: perluWheelchair ? catatanMobiliti : null
          })
          .select()
          .single();

        if (errPesakit) {
          if (errPesakit.code === '23505') {
            const { data: pesakitKonflik } = await supabase
              .from('pesakit')
              .select('id')
              .eq('no_ic', noIC.trim())
              .single();
            pesakitId = pesakitKonflik!.id;
          } else {
            throw errPesakit;
          }
        } else {
          pesakitId = pesakitBaru.id;
        }
      }

      // Jana Nombor Giliran Hari Ini mengikut Zon Masa Malaysia (GMT+8)
      const tarikhHariIniMY = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const { count } = await supabase
        .from('giliran')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${tarikhHariIniMY}T00:00:00+08:00`);

      const turutan = (count || 0) + 1;
      const noGiliranJana = `K-${String(turutan).padStart(3, '0')}`;

      // Semak Nombor Terkini Sebelum
      const { data: giliranAktif } = await supabase
        .from('giliran')
        .select('no_giliran, status')
        .in('status', ['dipanggil', 'sedang_rawat', 'rawatan'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let noSebelum = giliranAktif?.no_giliran || null;
      if (!noSebelum && turutan > 1) {
        noSebelum = `K-${String(turutan - 1).padStart(3, '0')}`;
      }

      const targetPerawatId = (pilihTabibKhusus && perawatDipilih) ? perawatDipilih : null;
      const ustazObj = targetPerawatId ? senaraiPerawat.find(u => u.id === targetPerawatId) : null;

      const { error: errGiliran } = await supabase
        .from('giliran')
        .insert({
          no_giliran: noGiliranJana,
          pesakit_id: pesakitId,
          perawat_id: targetPerawatId,
          status: 'menunggu',
          jenis_pendaftaran: 'kiosk',
          perlu_kerusi_roda: perluWheelchair,
          no_plat_kereta: perluWheelchair ? noPlatKereta.trim().toUpperCase() : null,
          status_kerusi_roda: perluWheelchair ? 'menunggu_bantuan' : 'tiada'
        });

      if (errGiliran) throw errGiliran;

      const dataTiketBaharu = {
        no_giliran: noGiliranJana,
        nama: nama.trim(),
        no_telefon: noTelefon.trim(),
        perawat_id: targetPerawatId,
        perawat_nama: ustazObj ? ustazObj.nama : null,
        lokasi: ustazObj ? ustazObj.no_bilik : 'Diumumkan di Skrin TV',
        masa: new Date().toLocaleTimeString('ms-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour: '2-digit',
          minute: '2-digit'
        }),
        tarikh: new Date().toLocaleDateString('ms-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        perlu_kerusi_roda: perluWheelchair,
        no_plat_kereta: noPlatKereta.trim().toUpperCase(),
        no_terkini_sebelum: noSebelum || 'Sedang Bermula'
      };

      setTiketSelesai(dataTiketBaharu);

      // Terus cetuskan cetakan
      cetakResitThermal(dataTiketBaharu, iframeCetak);

      // Tutup paparan resit secara automatik selepas 8 saat jika belum ditutup oleh onafterprint
      if (timerTutupRef.current) clearTimeout(timerTutupRef.current);
      timerTutupRef.current = setTimeout(() => {
        semakSemula();
      }, 8000);

    } catch (err: any) {
      alert('Ralat pendaftaran: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const renderPilihanTabib = () => (
    <div style={{
      backgroundColor: '#162032',
      border: '1.5px solid #1e293b',
      borderRadius: '0.75rem',
      padding: '1.15rem',
      marginBottom: '1.25rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <Stethoscope size={16} /> Agihan Tabib Rawatan
        </label>
        
        <button
          type="button"
          onClick={() => setPilihTabibKhusus(!pilihTabibKhusus)}
          style={{
            background: 'none',
            border: 'none',
            color: pilihTabibKhusus ? '#f87171' : '#38bdf8',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            textDecoration: 'underline'
          }}
        >
          {pilihTabibKhusus ? '← Tukar ke Automatik' : 'Pilih Tabib Tertentu?'}
        </button>
      </div>

      {!pilihTabibKhusus ? (
        <div style={{
          backgroundColor: '#0b1120',
          border: '1px dashed #0284c7',
          borderRadius: '0.6rem',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            backgroundColor: 'rgba(2, 132, 199, 0.2)',
            color: '#38bdf8',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
              Automatik (Tabib Pertama Bersedia)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
              Sistem akan agihkan giliran anda ke bilik tabib yang pertama kosong untuk giliran lebih pantas.
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: '0 0 0.5rem 0' }}>
            Sila pilih nama tabib yang anda ingin temui:
          </p>
          <select
            value={perawatDipilih}
            onChange={(e) => setPerawatDipilih(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#0b1120',
              border: '1px solid #0284c7',
              borderRadius: '0.5rem',
              padding: '0.75rem 0.85rem',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          >
            {senaraiPerawat.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama} ({u.no_bilik})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0b1120',
      color: '#f8fafc',
      padding: '2rem 1rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '1.25rem',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
      }}>

        <div style={{ marginBottom: '1rem' }}>
          <Link href="/" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Kembali ke Menu Utama
          </Link>
        </div>

        {/* Logo SyifaLink */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img 
            src="/logo.png" 
            alt="Logo SyifaLink" 
            style={{ 
              width: '160px', 
              height: 'auto', 
              margin: '0 auto 0.75rem auto', 
              display: 'block',
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))'
            }} 
          />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            Kiosk Pendaftaran Giliran &amp; Rawatan Darussyifa&apos;
          </p>
        </div>

        {/* BAHAGIAN 1: SEMAK NO. IC */}
        {statusSemakan === 'mula' && (
          <form onSubmit={tanganiSemakan}>
            <div style={{
              backgroundColor: '#162032',
              border: '1px solid #334155',
              borderRadius: '0.85rem',
              padding: '1.35rem',
              marginBottom: '1.25rem'
            }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Search size={18} /> Semakan Rekod Pesakit
              </h2>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.4rem' }}>
                  No. Kad Pengenalan: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="cth: 850101015555"
                  value={carianIC}
                  onChange={(e) => setCarianIC(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0b1120',
                    border: '1.5px solid #475569',
                    borderRadius: '0.5rem',
                    padding: '0.8rem 0.9rem',
                    color: '#ffffff',
                    fontSize: '1.05rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.04em'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={sedangSemak}
                style={{
                  width: '100%',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem'
                }}
              >
                <Search size={18} /> {sedangSemak ? 'Menyemak Pangkalan Data...' : 'Semak Rekod'}
              </button>
            </div>
          </form>
        )}

        {/* BAHAGIAN 2A: REKOD DITEMUI */}
        {statusSemakan === 'ditemui' && pesakitDitemui && (
          <form onSubmit={prosesDaftarDanAutoAksi}>
            <div style={{
              backgroundColor: '#062d22',
              border: '1.5px solid #059669',
              borderRadius: '0.85rem',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#34d399', fontWeight: 800, fontSize: '0.92rem' }}>
                  <UserCheck size={20} /> Rekod Pesakit Ditemui
                </span>
                <button
                  type="button"
                  onClick={semakSemula}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <RefreshCw size={13} /> Tukar No. IC
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Nama Pesakit:</span>{' '}
                  <strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>{nama}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>No. Kad Pengenalan:</span>{' '}
                  <span style={{ color: '#e2e8f0' }}>{noIC}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>No. Telefon:</span>{' '}
                  <span style={{ color: '#e2e8f0' }}>{noTelefon}</span>
                </div>
                {alamat && (
                  <div>
                    <span style={{ color: '#94a3b8' }}>Alamat:</span>{' '}
                    <span style={{ color: '#cbd5e1' }}>{alamat}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bantuan Kerusi Roda */}
            <div style={{
              backgroundColor: '#162032',
              border: perluWheelchair ? '1.5px solid #f59e0b' : '1px solid #334155',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                  <Accessibility size={20} color={perluWheelchair ? '#fbbf24' : '#38bdf8'} />
                  Perlukan Bantuan Kerusi Roda (Wheelchair)?
                </span>
                <input
                  type="checkbox"
                  checked={perluWheelchair}
                  onChange={(e) => setPerluWheelchair(e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
              </label>

              {perluWheelchair && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed #334155' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem' }}>
                    <Car size={14} color="#f59e0b" /> No. Plat Kenderaan:
                  </label>
                  <input
                    type="text"
                    required={perluWheelchair}
                    placeholder="cth: VAA 8821 (Alza Hitam)"
                    value={noPlatKereta}
                    onChange={(e) => setNoPlatKereta(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0b1120',
                      border: '1px solid #f59e0b',
                      borderRadius: '0.4rem',
                      padding: '0.55rem 0.75rem',
                      color: '#fef08a',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

            {renderPilihanTabib()}

            <button
              type="submit"
              disabled={memproses}
              style={{
                width: '100%',
                backgroundColor: '#10b981',
                color: '#022c22',
                fontWeight: 900,
                fontSize: '1.15rem',
                border: 'none',
                borderRadius: '0.65rem',
                padding: '1rem',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              {memproses ? 'Memproses Pendaftaran...' : 'Daftar Giliran & Cetak Tiket'}
            </button>
          </form>
        )}

        {/* BAHAGIAN 2B: PESAKIT BAHARU */}
        {statusSemakan === 'baharu' && (
          <form onSubmit={prosesDaftarDanAutoAksi}>
            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '0.85rem',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: 800, fontSize: '0.92rem' }}>
                  <UserPlus size={20} /> Pendaftaran Pesakit Baharu
                </span>
                <button
                  type="button"
                  onClick={semakSemula}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <RefreshCw size={13} /> Tukar No. IC
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    No. Kad Pengenalan: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={noIC}
                    onChange={(e) => setNoIC(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0b1120',
                      border: '1px solid #475569',
                      borderRadius: '0.4rem',
                      padding: '0.65rem 0.75rem',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    Nama Penuh: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Ahmad bin Abdullah"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0b1120',
                      border: '1px solid #475569',
                      borderRadius: '0.4rem',
                      padding: '0.65rem 0.75rem',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    No. Telefon: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: 0191234567"
                    value={noTelefon}
                    onChange={(e) => setNoTelefon(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0b1120',
                      border: '1px solid #475569',
                      borderRadius: '0.4rem',
                      padding: '0.65rem 0.75rem',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    Alamat Kediaman (Pilihan):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="cth: No. 12, Jalan Mawar, Seksyen 7, Shah Alam"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0b1120',
                      border: '1px solid #475569',
                      borderRadius: '0.4rem',
                      padding: '0.55rem 0.75rem',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bantuan Kerusi Roda */}
            <div style={{
              backgroundColor: '#162032',
              border: perluWheelchair ? '1.5px solid #f59e0b' : '1px solid #334155',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                  <Accessibility size={20} color={perluWheelchair ? '#fbbf24' : '#38bdf8'} />
                  Perlukan Bantuan Kerusi Roda (Wheelchair)?
                </span>
                <input
                  type="checkbox"
                  checked={perluWheelchair}
                  onChange={(e) => setPerluWheelchair(e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
              </label>

              {perluWheelchair && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed #334155' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem' }}>
                    <Car size={14} color="#f59e0b" /> No. Plat Kenderaan:
                  </label>
                  <input
                    type="text"
                    required={perluWheelchair}
                    placeholder="cth: VAA 8821 (Alza Hitam)"
                    value={noPlatKereta}
                    onChange={(e) => setNoPlatKereta(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0b1120',
                      border: '1px solid #f59e0b',
                      borderRadius: '0.4rem',
                      padding: '0.55rem 0.75rem',
                      color: '#fef08a',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

            {renderPilihanTabib()}

            <button
              type="submit"
              disabled={memproses}
              style={{
                width: '100%',
                backgroundColor: '#10b981',
                color: '#022c22',
                fontWeight: 900,
                fontSize: '1.15rem',
                border: 'none',
                borderRadius: '0.65rem',
                padding: '1rem',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              {memproses ? 'Memproses Pendaftaran...' : 'Daftar Giliran & Cetak Tiket'}
            </button>
          </form>
        )}
      </div>

      {/* MODAL PENGESAHAN DI SKRIN KIOSK */}
      {tiketSelesai && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '280px',
            padding: '1.25rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              color: '#059669',
              fontSize: '0.85rem',
              fontWeight: 800,
              marginBottom: '0.5rem'
            }}>
              <CheckCircle2 size={18} /> Pendaftaran Berjaya
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
              NOMBOR GILIRAN ANDA
            </div>

            <div style={{
              fontSize: '3.25rem',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.1,
              margin: '0.25rem 0 0.75rem 0'
            }}>
              {tiketSelesai.no_giliran}
            </div>

            <div style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              padding: '0.65rem',
              marginBottom: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div>Nama: <strong>{tiketSelesai.nama}</strong></div>
              {tiketSelesai.perawat_nama && <div>Tabib: <strong>{tiketSelesai.perawat_nama}</strong></div>}
              <div>Bilik: <strong>{tiketSelesai.lokasi}</strong></div>
              <div>No. Terkini: <strong>{tiketSelesai.no_terkini_sebelum}</strong></div>
            </div>

            <button
              type="button"
              onClick={() => cetakResitThermal(tiketSelesai)}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.65rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                marginBottom: '0.5rem'
              }}
            >
              <Printer size={16} /> Cetak Semula Tiket
            </button>

            <button
              type="button"
              onClick={semakSemula}
              style={{
                width: '100%',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                padding: '0.55rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Selesai / Daftar Pesakit Seterusnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}