'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Perawat } from '@/lib/types';
import styles from './perawat.module.css';
import { 
  Send, 
  Bell, 
  PlusCircle, 
  FileText, 
  DoorOpen, 
  LogOut, 
  Accessibility, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface ItemPenawar {
  id: string;
  nama_item: string;
  harga: number;
}

interface BilikRawatan {
  id: number;
  nama_bilik: string;
  perawat_semasa_id: string | null;
  sesi: string | null;
  status: string;
  perawat?: { nama: string };
}

const SENARAI_REAKSI = [
  'Tenang / Tiada Reaksi',
  'Sendawa / Menguap Kerap',
  'Panas Tengkuk / Kepala',
  'Gelisah / Sesak Dada',
  'Menggigil / Menggeletar',
  'Menjerit / Histeria'
];

const SEBAB_MC_PRESET = [
  'Kelesuan fizikal melampau selepas rawatan ruqyah intensif',
  'Gangguan emosi & mental memerlukan rehat kendiri',
  'Pening & loya kesan reaksi pembersihan ruqyah',
  'Rehat mandian penawar & rawatan lanjutan di rumah'
];

export default function KonsolPerawat() {
  const [senaraiPerawat, setSenaraiPerawat] = useState<Perawat[]>([]);
  const [ustazSemasa, setUstazSemasa] = useState<Perawat | null>(null);

  // Status Bilik Dinamik
  const [semuaBilik, setSemuaBilik] = useState<BilikRawatan[]>([]);
  const [bilikAktif, setBilikAktif] = useState<BilikRawatan | null>(null);
  const [bilikPilihanId, setBilikPilihanId] = useState<number | null>(null);
  const [sesiPilihan, setSesiPilihan] = useState<'pagi' | 'malam'>('pagi');

  // Giliran Pesakit
  const [giliranAktif, setGiliranAktif] = useState<any | null>(null);
  const [bilanganMenunggu, setBilanganMenunggu] = useState(0);
  const [senaraiPenawarDB, setSenaraiPenawarDB] = useState<ItemPenawar[]>([]);

  // Sesi Rawatan
  const [reaksiDipilih, setReaksiDipilih] = useState<string[]>([]);
  const [penawarDipilih, setPenawarDipilih] = useState<{ [id: string]: number }>({});
  const [itemTambahan, setItemTambahan] = useState('');
  const [hargaTambahan, setHargaTambahan] = useState('');
  const [perluMC, setPerluMC] = useState(false);
  const [tempohMC, setTempohMC] = useState(1);
  const [sebabMC, setSebabMC] = useState(SEBAB_MC_PRESET[0]);

  const [memproses, setMemproses] = useState(false);
  const [notifikasiMesej, setNotifikasiMesej] = useState<{ teks: string; jenis: 'sukses' | 'ralat' } | null>(null);

  const paparNotifikasi = (teks: string, jenis: 'sukses' | 'ralat' = 'sukses') => {
    setNotifikasiMesej({ teks, jenis });
    setTimeout(() => setNotifikasiMesej(null), 4000);
  };

  // 1. Muat Turun Data Asas
  const inisialisasi = async () => {
    const { data: perawatData } = await supabase
      .from('perawat')
      .select('*')
      .order('nama', { ascending: true });

    if (perawatData && perawatData.length > 0) {
      setSenaraiPerawat(perawatData);
      if (!ustazSemasa) setUstazSemasa(perawatData[0]);
    }

    const { data: penawarData } = await supabase
      .from('bahan_penawar')
      .select('id, nama_item, harga');

    if (penawarData) setSenaraiPenawarDB(penawarData);
  };

  // 2. Semak Status Bilik Dinamik Masa Nyata
  const muatDataBilik = async () => {
    const { data: bilikData } = await supabase
      .from('bilik_rawatan')
      .select('*, perawat(nama)')
      .order('id', { ascending: true });

    if (bilikData) {
      setSemuaBilik(bilikData);
      if (ustazSemasa) {
        const sayaPunya = bilikData.find(b => String(b.perawat_semasa_id) === String(ustazSemasa.id));
        setBilikAktif(sayaPunya || null);
      }
    }
  };

  useEffect(() => {
    inisialisasi();
  }, []);

  useEffect(() => {
    if (ustazSemasa) {
      muatDataBilik();
      muatSemulaGiliran();
    }
  }, [ustazSemasa]);

  useEffect(() => {
    const saluran = supabase
      .channel('bilik_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bilik_rawatan' }, () => {
        muatDataBilik();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(saluran);
    };
  }, [ustazSemasa]);

  // 3. Semak Giliran Pesakit
  const muatSemulaGiliran = async () => {
    if (!ustazSemasa) return;

    const { data: aktif } = await supabase
      .from('giliran')
      .select('*, pesakit(*)')
      .eq('perawat_id', ustazSemasa.id)
      .eq('status', 'sedang_rawat')
      .maybeSingle();

    setGiliranAktif(aktif || null);

    const { count } = await supabase
      .from('giliran')
      .select('*', { count: 'exact', head: true })
      .or(`perawat_id.is.null,perawat_id.eq.${ustazSemasa.id}`)
      .eq('status', 'menunggu');

    setBilanganMenunggu(count || 0);
  };

  // 4. Tindakan: CHECK-IN BILIK
  const tanganiCheckIn = async () => {
    if (!bilikPilihanId || !ustazSemasa) return;
    setMemproses(true);

    try {
      await supabase
        .from('bilik_rawatan')
        .update({
          perawat_semasa_id: null,
          sesi: null,
          status: 'kosong',
          waktu_check_in: null
        })
        .eq('perawat_semasa_id', ustazSemasa.id);

      const { error } = await supabase
        .from('bilik_rawatan')
        .update({
          perawat_semasa_id: ustazSemasa.id,
          sesi: sesiPilihan,
          status: 'aktif',
          waktu_check_in: new Date().toISOString()
        })
        .eq('id', bilikPilihanId);

      if (error) throw error;

      await muatDataBilik();
      paparNotifikasi('Berjaya check-in ke bilik! Sistem TV dan giliran kini aktif.');
    } catch (err: any) {
      paparNotifikasi('Ralat semasa check-in: ' + err.message, 'ralat');
    } finally {
      setMemproses(false);
    }
  };

  // 5. Tindakan: CHECK-OUT BILIK
  const tanganiCheckOut = async () => {
    if (!bilikAktif && !ustazSemasa) return;
    setMemproses(true);

    try {
      const idBilikLepas = bilikAktif?.id;

      let query = supabase
        .from('bilik_rawatan')
        .update({
          perawat_semasa_id: null,
          sesi: null,
          status: 'kosong',
          waktu_check_in: null
        });

      if (idBilikLepas && ustazSemasa) {
        query = query.or(`id.eq.${idBilikLepas},perawat_semasa_id.eq.${ustazSemasa.id}`);
      } else if (idBilikLepas) {
        query = query.eq('id', idBilikLepas);
      } else if (ustazSemasa) {
        query = query.eq('perawat_semasa_id', ustazSemasa.id);
      }

      const { error } = await query;
      if (error) throw error;

      setBilikAktif(null);
      setBilikPilihanId(null);
      await muatDataBilik();
      paparNotifikasi('Bilik berjaya dilepaskan. Sedia untuk perawat seterusnya.');
    } catch (err: any) {
      paparNotifikasi('Ralat semasa check-out: ' + err.message, 'ralat');
    } finally {
      setMemproses(false);
    }
  };

  // 6. Panggil Pesakit Seterusnya
  const panggilPesakitSeterusnya = async () => {
    if (!ustazSemasa || !bilikAktif) {
      paparNotifikasi('Sila check-in ke bilik rawatan terlebih dahulu sebelum memanggil pesakit.', 'ralat');
      return;
    }

    setMemproses(true);
    try {
      const { data: giliranSeterusnya, error: errCari } = await supabase
        .from('giliran')
        .select('id, no_giliran')
        .or(`perawat_id.is.null,perawat_id.eq.${ustazSemasa.id}`)
        .eq('status', 'menunggu')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (errCari) throw errCari;

      if (!giliranSeterusnya) {
        paparNotifikasi('Tiada pesakit lagi dalam barisan menunggu.', 'ralat');
        return;
      }

      const masaKini = new Date().toISOString();
      const { error: errUpdate } = await supabase
        .from('giliran')
        .update({ 
          perawat_id: ustazSemasa.id,
          status: 'sedang_rawat',
          waktu_panggil: masaKini
        })
        .eq('id', giliranSeterusnya.id);

      if (errUpdate) throw errUpdate;

      paparNotifikasi(`Nombor ${giliranSeterusnya.no_giliran} sedang dipanggil di skrin TV!`);
      await muatSemulaGiliran();
    } catch (err: any) {
      paparNotifikasi('Ralat memanggil pesakit: ' + err.message, 'ralat');
    } finally {
      setMemproses(false);
    }
  };

  // 7. PANGGIL SEMULA PESAKIT (RECALL KE TV - TANPA ALERT SEKATAN)
  const panggilSemula = async () => {
    if (!giliranAktif) return;
    setMemproses(true);

    try {
      const masaKini = new Date().toISOString();

      // Kemas kini waktu_panggil untuk memicu audio TV
      const { error } = await supabase
        .from('giliran')
        .update({
          status: 'sedang_rawat',
          waktu_panggil: masaKini
        })
        .eq('id', giliranAktif.id);

      if (error) {
        // Sandaran jika lajur waktu_panggil tiada
        await supabase
          .from('giliran')
          .update({ status: 'sedang_rawat' })
          .eq('id', giliranAktif.id);
      }

      paparNotifikasi(`Panggilan semula nombor ${giliranAktif.no_giliran} telah dihantar ke skrin TV!`);
    } catch (err: any) {
      paparNotifikasi('Ralat panggil semula: ' + err.message, 'ralat');
    } finally {
      setMemproses(false);
    }
  };

  // 8. LANGKAU PESAKIT (QUEUE BALIK - SATU KLIK TERUS BERFUNGSI)
  const langkauPesakit = async () => {
    if (!giliranAktif) return;
    setMemproses(true);

    try {
      const idPesakitLangkau = giliranAktif.id;
      const noGiliranLangkau = giliranAktif.no_giliran;
      const masaSekarang = new Date().toISOString();

      // Kemas kini status ke 'menunggu', lepaskan bilik perawat, dan letakkan di hujung barisan
      const { error } = await supabase
        .from('giliran')
        .update({
          status: 'menunggu',
          perawat_id: null,
          waktu_panggil: null,
          created_at: masaSekarang
        })
        .eq('id', idPesakitLangkau);

      if (error) {
        // Sandaran sekiranya pangkalan data tidak membenarkan ubah created_at
        await supabase
          .from('giliran')
          .update({
            status: 'menunggu',
            perawat_id: null,
            waktu_panggil: null
          })
          .eq('id', idPesakitLangkau);
      }

      // Kosongkan kad pesakit semasa di konsol perawat
      setReaksiDipilih([]);
      setPenawarDipilih({});
      setItemTambahan('');
      setHargaTambahan('');
      setPerluMC(false);
      setTempohMC(1);
      setSebabMC(SEBAB_MC_PRESET[0]);
      setGiliranAktif(null);

      await muatSemulaGiliran();
      paparNotifikasi(`Nombor ${noGiliranLangkau} telah dilangkau dan dimasukkan semula ke barisan menunggu.`);
    } catch (err: any) {
      paparNotifikasi('Ralat melangkau pesakit: ' + err.message, 'ralat');
    } finally {
      setMemproses(false);
    }
  };

  const toggleReaksi = (nama: string) => {
    setReaksiDipilih(prev => prev.includes(nama) ? prev.filter(r => r !== nama) : [...prev, nama]);
  };

  const togglePenawar = (item: ItemPenawar) => {
    setPenawarDipilih(prev => {
      const copy = { ...prev };
      if (copy[item.id]) delete copy[item.id];
      else copy[item.id] = 1;
      return copy;
    });
  };

  const jumlahPenawarPiawai = Object.entries(penawarDipilih).reduce((total, [itemId, qty]) => {
    const item = senaraiPenawarDB.find(p => p.id === itemId);
    return total + (item ? item.harga * qty : 0);
  }, 0);
  const nilaiHargaTambahan = parseFloat(hargaTambahan) || 0;
  const jumlahKeseluruhan = jumlahPenawarPiawai + nilaiHargaTambahan;

  // 9. Hantar Rawatan & Data Sijil MC ke Farmasi
  const hantarLaporanKeFarmasi = async () => {
    if (!giliranAktif || !ustazSemasa) return;
    setMemproses(true);

    try {
      const { data: sesi, error: errSesi } = await supabase
        .from('sesi_rawatan')
        .insert({
          giliran_id: giliranAktif.id,
          pesakit_id: giliranAktif.pesakit_id,
          perawat_id: ustazSemasa.id,
          reaksi_rawatan: reaksiDipilih,
          dapatan_gangguan: reaksiDipilih.length > 0 ? reaksiDipilih.join(', ') : 'Selesai Ruqyah Syar’iyyah',
          item_tambahan: itemTambahan.trim() || null,
          harga_tambahan: nilaiHargaTambahan,
          perlu_mc: perluMC,
          tempoh_mc_hari: perluMC ? tempohMC : 0,
          sebab_mc: perluMC ? sebabMC : null
        })
        .select()
        .single();

      if (errSesi) throw errSesi;

      const senaraiItemFormat: any[] = Object.entries(penawarDipilih).map(([itemId, qty]) => {
        const item = senaraiPenawarDB.find(p => p.id === itemId);
        return {
          item_id: itemId,
          nama: item?.nama_item || 'Bahan Ruqyah',
          kuantiti: qty,
          harga_seunit: item?.harga || 0
        };
      });

      if (itemTambahan.trim()) {
        senaraiItemFormat.push({
          item_id: 'custom_item',
          nama: `${itemTambahan.trim()} (Khas)`,
          kuantiti: 1,
          harga_seunit: nilaiHargaTambahan
        });
      }

      if (perluMC) {
        senaraiItemFormat.push({
          item_id: 'sijil_mc',
          nama: `Sijil Perakuan Cuti Sakit (${tempohMC} Hari)`,
          kuantiti: 1,
          harga_seunit: 0.00
        });
      }

      await supabase.from('pesanan_ubat').insert({
        sesi_rawatan_id: sesi.id,
        pesakit_id: giliranAktif.pesakit_id,
        senarai_item: senaraiItemFormat,
        jumlah_bayaran: jumlahKeseluruhan,
        status_bungkusan: 'perlu_bungkus',
        status_bayaran: 'belum_bayar'
      });

      await supabase
        .from('giliran')
        .update({ status: 'ke_farmasi', waktu_selesai: new Date().toISOString() })
        .eq('id', giliranAktif.id);

      setReaksiDipilih([]);
      setPenawarDipilih({});
      setItemTambahan('');
      setHargaTambahan('');
      setPerluMC(false);
      setTempohMC(1);
      setSebabMC(SEBAB_MC_PRESET[0]);
      setGiliranAktif(null);
      await muatSemulaGiliran();

      paparNotifikasi('Laporan rawatan berjaya dihantar ke Kaunter Farmasi!');
    } catch (err: any) {
      paparNotifikasi('Ralat: ' + err.message, 'ralat');
    } finally {
      setMemproses(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mobileWrapper}>
        <div style={{ marginBottom: '0.75rem' }}>
          <Link href="/" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Menu Utama
          </Link>
        </div>

        {/* Banner Notifikasi Terapung (Maklum Balas Visual Bebas Ralat Pelayar) */}
        {notifikasiMesej && (
          <div style={{
            backgroundColor: notifikasiMesej.jenis === 'sukses' ? '#065f46' : '#7f1d1d',
            border: `1px solid ${notifikasiMesej.jenis === 'sukses' ? '#10b981' : '#ef4444'}`,
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            color: '#ffffff',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.85rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {notifikasiMesej.jenis === 'sukses' ? <CheckCircle2 size={18} color="#34d399" /> : <AlertCircle size={18} color="#f87171" />}
            <span>{notifikasiMesej.teks}</span>
          </div>
        )}

        {/* Profil Ustaz Bertugas */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Konsol Perawat</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              Menunggu: <strong style={{ color: '#38bdf8' }}>{bilanganMenunggu} orang</strong>
            </p>
          </div>
          <select
            className={styles.selectUstaz}
            value={ustazSemasa?.id || ''}
            onChange={(e) => {
              const u = senaraiPerawat.find(item => item.id === e.target.value);
              if (u) setUstazSemasa(u);
            }}
          >
            {senaraiPerawat.map((u) => (
              <option key={u.id} value={u.id}>{u.nama}</option>
            ))}
          </select>
        </header>

        {/* MODUL CHECK-IN / CHECK-OUT */}
        {bilikAktif ? (
          <div className={styles.activeRoomBanner}>
            <div className={styles.roomInfoActive}>
              <span>Sedang Bertugas di:</span><br />
              <strong>{bilikAktif.nama_bilik}</strong> ({bilikAktif.sesi === 'pagi' ? 'Sesi Pagi' : 'Sesi Malam'})
            </div>
            <button type="button" onClick={tanganiCheckOut} disabled={memproses} className={styles.btnCheckOut}>
              <LogOut size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
              Tamat Syif / Lepas Bilik
            </button>
          </div>
        ) : (
          <div className={styles.checkInCard}>
            <DoorOpen size={36} color="#38bdf8" style={{ marginBottom: '0.5rem' }} />
            <h2 className={styles.checkInTitle}>Check-In Bilik Rawatan</h2>
            <p className={styles.checkInSub}>Sila pilih sesi dan bilik fizikal yang anda gunakan hari ini:</p>

            <div className={styles.sessionSelector}>
              <button
                type="button"
                onClick={() => setSesiPilihan('pagi')}
                className={`${styles.sessionBtn} ${sesiPilihan === 'pagi' ? styles.sessionBtnActive : ''}`}
              >
                Sesi Pagi (08:30 AM - 01:30 PM)
              </button>
              <button
                type="button"
                onClick={() => setSesiPilihan('malam')}
                className={`${styles.sessionBtn} ${sesiPilihan === 'malam' ? styles.sessionBtnActive : ''}`}
              >
                Sesi Malam (08:00 PM - 11:00 PM)
              </button>
            </div>

            <div className={styles.roomGridSelect}>
              {semuaBilik.map((b) => {
                const sedangDipakaiOrangLain = Boolean(b.perawat_semasa_id && String(b.perawat_semasa_id) !== String(ustazSemasa?.id));
                const dipilihSaya = bilikPilihanId === b.id;

                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={sedangDipakaiOrangLain}
                    onClick={() => setBilikPilihanId(b.id)}
                    className={`${styles.roomSelectBtn} ${dipilihSaya ? styles.roomSelectBtnSelected : ''} ${sedangDipakaiOrangLain ? styles.roomSelectBtnOccupied : ''}`}
                  >
                    <span>{b.nama_bilik}</span>
                    <span className={`${styles.roomStatusPill} ${sedangDipakaiOrangLain ? styles.pillOccupied : styles.pillKosong}`}>
                      {sedangDipakaiOrangLain ? `Digunakan: ${b.perawat?.nama || 'Ustaz Lain'}` : 'Tersedia'}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={memproses || !bilikPilihanId}
              onClick={tanganiCheckIn}
              className={styles.btnCheckInSubmit}
            >
              Masuk Bilik & Mula Bertugas
            </button>
          </div>
        )}

        {/* Pesakit Semasa */}
        {bilikAktif && (
          <>
            {giliranAktif ? (
              <div className={styles.currentPatientCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className={styles.patientNumber}>{giliranAktif.no_giliran}</div>
                  {Boolean(giliranAktif.perlu_kerusi_roda || giliranAktif.pesakit?.perlu_kerusi_roda) && (
                    <span style={{
                      backgroundColor: '#78350f',
                      border: '1px solid #f59e0b',
                      color: '#fef08a',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <Accessibility size={14} /> Berkerusi Roda
                    </span>
                  )}
                </div>
                <div className={styles.patientName}>{giliranAktif.pesakit?.nama}</div>
                <p className={styles.patientSub}>No. IC: {giliranAktif.pesakit?.no_ic}</p>
                {giliranAktif.pesakit?.alamat && (
                  <p className={styles.patientSub} style={{ marginTop: '0.25rem', opacity: 0.9 }}>
                    Alamat: {giliranAktif.pesakit?.alamat}
                  </p>
                )}

                {/* Butang Panggil Semula & Butang Langkau */}
                <div style={{ marginTop: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={panggilSemula}
                    disabled={memproses}
                    className={styles.btnCall}
                    style={{
                      padding: '0.65rem 0.5rem',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      justifyContent: 'center',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <Bell size={16} /> Panggil Semula
                  </button>

                  <button
                    type="button"
                    onClick={langkauPesakit}
                    disabled={memproses}
                    className={styles.btnCall}
                    style={{
                      padding: '0.65rem 0.5rem',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      justifyContent: 'center',
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={16} /> Langkau (Queue Balik)
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.waitingEmpty}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                  Tiada pesakit sedang dirawat di {bilikAktif.nama_bilik}.
                </p>
                <button
                  type="button"
                  onClick={panggilPesakitSeterusnya}
                  disabled={memproses || bilanganMenunggu === 0}
                  className={styles.btnCall}
                >
                  <Bell size={18} /> Panggil Pesakit Seterusnya ({bilanganMenunggu})
                </button>
              </div>
            )}

            {/* Borang Diagnostik & Penawar */}
            {giliranAktif && (
              <div>
                <div className={styles.sectionLabel}>1. Reaksi Semasa Ruqyah</div>
                <div className={styles.gridReaksi}>
                  {SENARAI_REAKSI.map((item) => {
                    const aktif = reaksiDipilih.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleReaksi(item)}
                        className={`${styles.pillBtn} ${aktif ? styles.pillBtnActive : ''}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.sectionLabel}>2. Penawar / Ubat Diberikan</div>
                <div className={styles.penawarList}>
                  {senaraiPenawarDB.map((item) => {
                    const dipilih = Boolean(penawarDipilih[item.id]);
                    return (
                      <div
                        key={item.id}
                        onClick={() => togglePenawar(item)}
                        className={`${styles.penawarItem} ${dipilih ? styles.penawarItemActive : ''}`}
                      >
                        <span className={styles.penawarTitle}>{item.nama_item}</span>
                        <span className={styles.penawarPrice}>RM {item.harga.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.sectionLabel}><PlusCircle size={16} /> 3. Penawar / Keperluan Khas Tambahan</div>
                <div className={styles.cardBox}>
                  <div className={styles.inputGroup}>
                    <input type="text" placeholder="Nama Penawar Khas" className={styles.textInput} value={itemTambahan} onChange={(e) => setItemTambahan(e.target.value)} />
                    <input type="number" placeholder="RM (0.00)" className={styles.priceInput} value={hargaTambahan} onChange={(e) => setHargaTambahan(e.target.value)} />
                  </div>
                </div>

                <div className={styles.sectionLabel}><FileText size={16} /> 4. Perakuan Cuti Rehat Ruqyah (MC)</div>
                <div className={styles.cardBox}>
                  <label className={styles.toggleContainer}>
                    <span className={styles.toggleLabel}>Keluarkan Sijil Cuti Rehat (MC)</span>
                    <input type="checkbox" className={styles.checkbox} checked={perluMC} onChange={(e) => setPerluMC(e.target.checked)} />
                  </label>
                  {perluMC && (
                    <div className={styles.mcOptions}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tempoh Cuti:</span>
                        <div className={styles.durationGrid} style={{ marginTop: '0.35rem' }}>
                          {[1, 2, 3].map((hari) => (
                            <button key={hari} type="button" onClick={() => setTempohMC(hari)} className={`${styles.durationPill} ${tempohMC === hari ? styles.durationPillActive : ''}`}>
                              {hari} Hari
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sebab Cuti:</span>
                        <select className={styles.textInput} style={{ width: '100%', marginTop: '0.35rem' }} value={sebabMC} onChange={(e) => setSebabMC(e.target.value)}>
                          {SEBAB_MC_PRESET.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Floating Bar Bawah */}
        {bilikAktif && giliranAktif && (
          <div className={styles.bottomBar}>
            <div className={styles.bottomBarContent}>
              <div>
                <span className={styles.totalLabel}>Jumlah Keseluruhan</span>
                <span className={styles.totalAmount}>RM {jumlahKeseluruhan.toFixed(2)}</span>
              </div>
              <button type="button" onClick={hantarLaporanKeFarmasi} disabled={memproses} className={styles.btnSubmit}>
                <Send size={18} />
                <span>{memproses ? 'Menghantar...' : 'Selesai & Hantar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}