// app/perawat/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './perawat.module.css';
import {
  User,
  CheckCircle,
  Clock,
  Stethoscope,
  LogOut,
  Bell,
  SkipForward,
  FileText,
  Pill,
  AlertCircle,
  DoorOpen,
  Calendar,
  Send,
  Plus,
  Minus,
  Sparkles,
  PlusCircle,
  Play,
  X
} from 'lucide-react';

interface Perawat {
  id: string;
  nama: string;
  no_bilik: string;
  no_telefon?: string;
  status_aktif: boolean;
}

interface BilikRawatan {
  id: number;
  nama_bilik: string;
  perawat_semasa_id: string | null;
  status: string;
  sesi: string | null;
  status_aktif: boolean;
  perawat?: { nama: string };
}

interface Pesakit {
  id: string;
  nama: string;
  no_ic: string;
  no_telefon: string;
  alamat?: string;
}

interface Giliran {
  id: string;
  no_giliran: string;
  status: string;
  waktu_panggil?: string;
  pesakit_id: string;
  perawat_id?: string | null;
  pesakit?: Pesakit;
}

interface BahanPenawar {
  id: string;
  nama_item: string;
  harga: number;
  stok_semasa: number;
  kategori: string;
}

interface ItemUbatDipilih {
  id: string;
  nama_item: string;
  harga: number;
  kuantiti: number;
}

const DEFAULT_REAKSI = [
  'Sendawa Berterusan',
  'Kerap Menguap / Mengantuk',
  'Menangis / Hiba Tanpa Sebab',
  'Panas / Menggigil Anggota Badan',
  'Kebas / Berat Bahagian Belakang',
  'Muntah / Rasa Loya',
  'Kerasukan / Reaksi Agresif',
  'Sesak Nafas / Dada Berdebar',
  'Pengsan / Lemah Sendi',
  'Tiada Sebarang Reaksi (Normal)'
];

export default function KonsolPerawat() {
  const [senaraiPerawat, setSenaraiPerawat] = useState<Perawat[]>([]);
  const [ustazSemasa, setUstazSemasa] = useState<Perawat | null>(null);

  // Status Bilik & Check-In
  const [senaraiBilik, setSenaraiBilik] = useState<BilikRawatan[]>([]);
  const [bilikSemasa, setBilikSemasa] = useState<BilikRawatan | null>(null);
  const [sesiDipilih, setSesiDipilih] = useState<'Sesi Pagi' | 'Sesi Malam'>('Sesi Pagi');
  const [bilikPilihanId, setBilikPilihanId] = useState<number | null>(null);

  // Barisan Giliran
  const [senaraiMenunggu, setSenaraiMenunggu] = useState<Giliran[]>([]);
  const [pesakitAktif, setPesakitAktif] = useState<Giliran | null>(null);
  const [memproses, setMemproses] = useState<boolean>(false);

  // Diagnostik & Rawatan
  const [senaraiReaksiDB, setSenaraiReaksiDB] = useState<string[]>(DEFAULT_REAKSI);
  const [reaksiDipilih, setReaksiDipilih] = useState<string[]>([]);
  const [catatanRawatan, setCatatanRawatan] = useState<string>('');
  const [senaraiBahan, setSenaraiBahan] = useState<BahanPenawar[]>([]);
  const [ubatDipilih, setUbatDipilih] = useState<ItemUbatDipilih[]>([]);
  const [perluMC, setPerluMC] = useState<boolean>(false);
  const [bilanganHariMC, setBilanganHariMC] = useState<number>(1);

  // Ruangan Reaksi Tambahan
  const [bukaInputTambahan, setBukaInputTambahan] = useState<boolean>(false);
  const [inputTeksTambahan, setInputTeksTambahan] = useState<string>('');

  // 1. Muat Senarai Perawat
  useEffect(() => {
    const ambilSenaraiPerawat = async () => {
      const { data } = await supabase
        .from('perawat')
        .select('*')
        .eq('status_aktif', true)
        .order('nama', { ascending: true });

      if (data && data.length > 0) {
        setSenaraiPerawat(data);
        const simpananId = localStorage.getItem('syifalink_perawat_id');
        const padanan = data.find((p) => p.id === simpananId);
        setUstazSemasa(padanan || data[0]);
      }
    };
    ambilSenaraiPerawat();
  }, []);

  // 2. Tetapkan Sesi Mengikut Waktu Semasa
  useEffect(() => {
    const jam = new Date().getHours();
    if (jam >= 15) {
      setSesiDipilih('Sesi Malam');
    } else {
      setSesiDipilih('Sesi Pagi');
    }
  }, []);

  // 3. Muat Data Bilik Rawatan
  const muatDataBilik = async () => {
    try {
      const { data: bilik } = await supabase
        .from('bilik_rawatan')
        .select('*, perawat(nama)')
        .order('id', { ascending: true });

      if (bilik) {
        setSenaraiBilik(bilik);
        if (ustazSemasa) {
          const bilikUstaz = bilik.find(
            (b) => b.perawat_semasa_id && String(b.perawat_semasa_id) === String(ustazSemasa.id)
          );
          setBilikSemasa(bilikUstaz || null);
          if (bilikUstaz) {
            setBilikPilihanId(bilikUstaz.id);
          }
        }
      }
    } catch (err) {
      console.warn('Ralat muat bilik:', err);
    }
  };

  // 4. Muat Reaksi Ruqyah Dinamik dari Pangkalan Data
  const muatSenaraiReaksi = async () => {
    try {
      const { data } = await supabase
        .from('reaksi_ruqyah')
        .select('nama_reaksi')
        .eq('status_aktif', true)
        .order('turutan', { ascending: true })
        .order('nama_reaksi', { ascending: true });

      if (data && data.length > 0) {
        setSenaraiReaksiDB(data.map((d) => d.nama_reaksi));
      } else {
        setSenaraiReaksiDB(DEFAULT_REAKSI);
      }
    } catch (err) {
      setSenaraiReaksiDB(DEFAULT_REAKSI);
    }
  };

  // 5. Muat Senarai Giliran Menunggu & Pesakit Aktif
  const muatSemulaGiliran = async () => {
    if (!ustazSemasa) return;

    try {
      const { data: senaraiAktif } = await supabase
        .from('giliran')
        .select('*, pesakit(id, nama, no_ic, no_telefon, alamat)')
        .eq('perawat_id', ustazSemasa.id)
        .in('status', ['dipanggil', 'sedang_rawat', 'rawatan']);

      if (senaraiAktif && senaraiAktif.length > 0) {
        const tersusun = [...senaraiAktif].sort((a, b) => {
          const masaA = new Date(a.waktu_panggil || a.updated_at || a.created_at || 0).getTime();
          const masaB = new Date(b.waktu_panggil || b.updated_at || b.created_at || 0).getTime();
          return masaB - masaA;
        });
        setPesakitAktif(tersusun[0]);
      } else {
        setPesakitAktif(null);
      }

      const { data: bilikAktif } = await supabase
        .from('bilik_rawatan')
        .select('perawat_semasa_id')
        .not('perawat_semasa_id', 'is', null);

      const idPerawatBertugas = bilikAktif
        ?.map((b) => b.perawat_semasa_id)
        .filter(Boolean) as string[];

      const { data: semuaMenunggu } = await supabase
        .from('giliran')
        .select('*, pesakit(id, nama, no_ic, no_telefon, alamat)')
        .eq('status', 'menunggu')
        .order('created_at', { ascending: true });

      if (semuaMenunggu) {
        const pesakitBolehDipanggil = semuaMenunggu.filter((g) => {
          if (!g.perawat_id) return true;
          if (String(g.perawat_id) === String(ustazSemasa.id)) return true;
          const perawatMasihAdaBilik = idPerawatBertugas.some(
            (id) => String(id) === String(g.perawat_id)
          );
          return !perawatMasihAdaBilik;
        });

        setSenaraiMenunggu(pesakitBolehDipanggil);
      }
    } catch (err) {
      console.warn('Ralat muat giliran:', err);
    }
  };

  // 6. Muat Senarai Ubat Penawar
  const muatDataUbat = async () => {
    try {
      const { data } = await supabase
        .from('bahan_penawar')
        .select('*')
        .gt('stok_semasa', 0)
        .order('nama_item', { ascending: true });

      if (data) setSenaraiBahan(data);
    } catch (err) {}
  };

  useEffect(() => {
    if (ustazSemasa) {
      localStorage.setItem('syifalink_perawat_id', ustazSemasa.id);
      muatDataBilik();
      muatSemulaGiliran();
      muatDataUbat();
      muatSenaraiReaksi();
    }
  }, [ustazSemasa]);

  // 7. Langganan Masa Nyata
  useEffect(() => {
    const pemasa = setInterval(() => {
      muatDataBilik();
      muatSemulaGiliran();
    }, 2500);

    const saluran = supabase
      .channel('konsol_perawat_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giliran' }, () => muatSemulaGiliran())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bilik_rawatan' }, () => muatDataBilik())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reaksi_ruqyah' }, () => muatSenaraiReaksi())
      .subscribe();

    return () => {
      clearInterval(pemasa);
      supabase.removeChannel(saluran);
    };
  }, [ustazSemasa, bilikSemasa]);

  // 8. Fungsi Check-In Bilik Rawatan
  const daftarMasukBilik = async () => {
    if (!ustazSemasa || !bilikPilihanId) {
      alert('Sila pilih bilik rawatan yang tersedia terlebih dahulu.');
      return;
    }

    setMemproses(true);
    try {
      await supabase
        .from('bilik_rawatan')
        .update({ 
          perawat_semasa_id: null, 
          sesi: null, 
          waktu_check_in: null 
        })
        .eq('perawat_semasa_id', ustazSemasa.id);

      const formatSesiDB = sesiDipilih === 'Sesi Malam' ? 'malam' : 'pagi';

      const { error } = await supabase
        .from('bilik_rawatan')
        .update({
          perawat_semasa_id: ustazSemasa.id,
          sesi: formatSesiDB,
          waktu_check_in: new Date().toISOString()
        })
        .eq('id', bilikPilihanId);

      if (error) throw error;

      await muatDataBilik();
      await muatSemulaGiliran();
    } catch (err: any) {
      alert('Gagal daftar masuk bilik: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // 9. Tamat Syif
  const tamatSyifLepasBilik = async () => {
    if (!bilikSemasa) return;
    if (pesakitAktif) {
      alert('Sila selesaikan atau langkau pesakit semasa sebelum melepaskan bilik.');
      return;
    }

    const sah = window.confirm(`Adakah anda pasti mahu tamat syif dan melepaskan ${bilikSemasa.nama_bilik}?`);
    if (!sah) return;

    setMemproses(true);
    try {
      await supabase
        .from('bilik_rawatan')
        .update({
          perawat_semasa_id: null,
          status: 'kosong',
          sesi: null,
          waktu_check_in: null
        })
        .eq('id', bilikSemasa.id);

      setBilikSemasa(null);
      setBilikPilihanId(null);
      await muatDataBilik();
      await muatSemulaGiliran();
    } catch (err: any) {
      alert('Ralat melepaskan bilik: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // 10. Panggil Pesakit Seterusnya
  const panggilPesakitSeterusnya = async () => {
    if (!ustazSemasa || !bilikSemasa) {
      alert('Sila daftar masuk bilik rawatan terlebih dahulu.');
      return;
    }

    if (senaraiMenunggu.length === 0) {
      alert('Tiada pesakit dalam senarai menunggu.');
      return;
    }

    setMemproses(true);
    try {
      await supabase
        .from('giliran')
        .update({ status: 'selesai' })
        .eq('perawat_id', ustazSemasa.id)
        .in('status', ['dipanggil', 'sedang_rawat', 'rawatan']);

      const pesakitSasaran = senaraiMenunggu[0];

      const { error } = await supabase
        .from('giliran')
        .update({
          status: 'dipanggil',
          perawat_id: ustazSemasa.id,
          waktu_panggil: new Date().toISOString()
        })
        .eq('id', pesakitSasaran.id);

      if (error) {
        await supabase
          .from('giliran')
          .update({
            status: 'dipanggil',
            perawat_id: ustazSemasa.id
          })
          .eq('id', pesakitSasaran.id);
      }

      setPesakitAktif({
        ...pesakitSasaran,
        status: 'dipanggil',
        perawat_id: ustazSemasa.id
      });

      setReaksiDipilih([]);
      setUbatDipilih([]);
      setCatatanRawatan('');
      setPerluMC(false);
      setBilanganHariMC(1);
      setBukaInputTambahan(false);
      setInputTeksTambahan('');

      await muatSemulaGiliran();
    } catch (err: any) {
      alert('Ralat memanggil pesakit: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // 11. Mula Rawatan
  const mulakanRawatan = async () => {
    if (!pesakitAktif || pesakitAktif.status === 'sedang_rawat') return;

    try {
      await supabase
        .from('giliran')
        .update({ status: 'sedang_rawat' })
        .eq('id', pesakitAktif.id);

      setPesakitAktif((prev) => (prev ? { ...prev, status: 'sedang_rawat' } : null));
    } catch (err) {
      console.warn('Ralat mengemas kini status rawatan:', err);
    }
  };

  const panggilSemulaPesakit = async () => {
    if (!pesakitAktif) return;
    setMemproses(true);
    try {
      await supabase
        .from('giliran')
        .update({ waktu_panggil: new Date().toISOString() })
        .eq('id', pesakitAktif.id);
    } finally {
      setMemproses(false);
    }
  };

  const langkauPesakit = async () => {
    if (!pesakitAktif) return;
    const sah = window.confirm(`Kembalikan nombor giliran ${pesakitAktif.no_giliran} ke senarai menunggu?`);
    if (!sah) return;

    setMemproses(true);
    try {
      await supabase
        .from('giliran')
        .update({
          status: 'menunggu',
          perawat_id: null,
          waktu_panggil: null
        })
        .eq('id', pesakitAktif.id);

      setPesakitAktif(null);
      setReaksiDipilih([]);
      setUbatDipilih([]);
      setCatatanRawatan('');
      setBukaInputTambahan(false);
      setInputTeksTambahan('');
      await muatSemulaGiliran();
    } catch (err: any) {
      alert('Ralat melangkau pesakit: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // 12. Pengendalian Reaksi
  const toggleReaksi = (reaksi: string) => {
    if (pesakitAktif && pesakitAktif.status === 'dipanggil') {
      mulakanRawatan();
    }

    setReaksiDipilih((prev) =>
      prev.includes(reaksi) ? prev.filter((r) => r !== reaksi) : [...prev, reaksi]
    );
  };

  const tambahReaksiKustom = () => {
    const teksBersih = inputTeksTambahan.trim();
    if (!teksBersih) return;

    if (pesakitAktif && pesakitAktif.status === 'dipanggil') {
      mulakanRawatan();
    }

    if (!reaksiDipilih.includes(teksBersih)) {
      setReaksiDipilih((prev) => [...prev, teksBersih]);
    }

    if (!senaraiReaksiDB.includes(teksBersih)) {
      setSenaraiReaksiDB((prev) => [...prev, teksBersih]);
    }

    setInputTeksTambahan('');
    setBukaInputTambahan(false);
  };

  // 13. Pengurusan Ubat Dipilih
  const tambahItemUbat = (bahan: BahanPenawar) => {
    if (pesakitAktif && pesakitAktif.status === 'dipanggil') {
      mulakanRawatan();
    }

    setUbatDipilih((prev) => {
      const wujud = prev.find((item) => item.id === bahan.id);
      if (wujud) {
        return prev.map((item) =>
          item.id === bahan.id ? { ...item, kuantiti: item.kuantiti + 1 } : item
        );
      }
      return [...prev, { id: bahan.id, nama_item: bahan.nama_item, harga: bahan.harga, kuantiti: 1 }];
    });
  };

  const tolakItemUbat = (id: string) => {
    setUbatDipilih((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, kuantiti: item.kuantiti - 1 } : item))
        .filter((item) => item.kuantiti > 0)
    );
  };

  // 14. Hantar Pesakit ke Farmasi & Kaunter Bayaran
  const hantarKeFarmasi = async () => {
    if (!pesakitAktif || !ustazSemasa) return;

    setMemproses(true);
    try {
      const dataSesi: any = {
        pesakit_id: pesakitAktif.pesakit_id,
        perawat_id: ustazSemasa.id,
        reaksi_rawatan: reaksiDipilih,
        dapatan_gangguan: reaksiDipilih.join(', ') || 'Rawatan Ruqyah Am',
        catatan_rawatan: catatanRawatan.trim() || null,
        senarai_ubat: ubatDipilih,
        diberi_mc: perluMC,
        tempoh_mc_hari: perluMC ? bilanganHariMC : 0
      };

      const { error: errSesi } = await supabase.from('sesi_rawatan').insert(dataSesi);

      if (errSesi) {
        await supabase.from('sesi_rawatan').insert({
          pesakit_id: pesakitAktif.pesakit_id,
          perawat_id: ustazSemasa.id,
          dapatan_gangguan: reaksiDipilih.join(', ') || 'Rawatan Ruqyah Am'
        });
      }

      const { error: errGiliran } = await supabase
        .from('giliran')
        .update({
          status: 'farmasi'
        })
        .eq('id', pesakitAktif.id);

      if (errGiliran) throw errGiliran;

      alert(`Pesakit ${pesakitAktif.no_giliran} berjaya dihantar ke Kaunter Bayaran & Farmasi.`);

      setPesakitAktif(null);
      setReaksiDipilih([]);
      setUbatDipilih([]);
      setCatatanRawatan('');
      setPerluMC(false);
      setBilanganHariMC(1);
      setBukaInputTambahan(false);
      setInputTeksTambahan('');

      await muatSemulaGiliran();
    } catch (err: any) {
      alert('Ralat memproses rawatan: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const jumlahBayaranUbat = ubatDipilih.reduce((acc, u) => acc + u.harga * u.kuantiti, 0);

  return (
    <div className={styles.container}>
      <div className={styles.topNav}>
        <Link href="/" className={styles.backLink}>
          ← Menu Utama
        </Link>
      </div>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Konsol Perawat</h1>
          <p className={styles.waitingCountText}>
            Menunggu: <strong>{senaraiMenunggu.length} orang</strong>
          </p>
        </div>

        <div>
          <select
            className={styles.doctorSelect}
            value={ustazSemasa?.id || ''}
            onChange={(e) => {
              const dipilih = senaraiPerawat.find((p) => p.id === e.target.value);
              if (dipilih) setUstazSemasa(dipilih);
            }}
          >
            {senaraiPerawat.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className={styles.mainContent}>
        {!bilikSemasa ? (
          <div className={styles.checkInCard}>
            <div className={styles.checkInIconWrapper}>
              <DoorOpen size={44} color="#38bdf8" />
            </div>

            <h2 className={styles.checkInTitle}>Check-In Bilik Rawatan</h2>
            <p className={styles.checkInSubtitle}>
              Sila pilih sesi dan bilik fizikal yang anda gunakan hari ini:
            </p>

            <div className={styles.sessionToggleRow}>
              <button
                type="button"
                className={`${styles.sessionBtn} ${sesiDipilih === 'Sesi Pagi' ? styles.sessionBtnActive : ''}`}
                onClick={() => setSesiDipilih('Sesi Pagi')}
              >
                Sesi Pagi (08:30 AM - 01:30 PM)
              </button>
              <button
                type="button"
                className={`${styles.sessionBtn} ${sesiDipilih === 'Sesi Malam' ? styles.sessionBtnActive : ''}`}
                onClick={() => setSesiDipilih('Sesi Malam')}
              >
                Sesi Malam (08:00 PM - 11:00 PM)
              </button>
            </div>

            <div className={styles.roomSelectGrid}>
              {senaraiBilik.map((b) => {
                const digunakan = Boolean(b.perawat_semasa_id);
                const dipilih = bilikPilihanId === b.id;

                return (
                  <div
                    key={b.id}
                    className={`${styles.roomSelectItem} ${dipilih ? styles.roomItemActive : ''} ${
                      digunakan ? styles.roomItemDisabled : ''
                    }`}
                    onClick={() => {
                      if (!digunakan) setBilikPilihanId(b.id);
                    }}
                  >
                    <span className={styles.roomSelectName}>{b.nama_bilik}</span>
                    <span className={digunakan ? styles.badgeUsed : styles.badgeAvailable}>
                      {digunakan ? `Digunakan: ${b.perawat?.nama || 'Perawat Lain'}` : 'Tersedia'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={memproses || !bilikPilihanId}
              onClick={daftarMasukBilik}
              className={styles.btnCheckInSubmit}
            >
              Masuk Bilik & Mula Bertugas
            </button>
          </div>
        ) : (
          <>
            <div className={styles.activeDutyBanner}>
              <div>
                <span className={styles.dutyLabel}>Sedang Bertugas di:</span>
                <span className={styles.dutyRoomName}>
                  {bilikSemasa.nama_bilik} ({bilikSemasa.sesi === 'malam' || bilikSemasa.sesi === 'Sesi Malam' ? 'Sesi Malam' : 'Sesi Pagi'})
                </span>
              </div>
              <button
                type="button"
                disabled={memproses}
                onClick={tamatSyifLepasBilik}
                className={styles.btnEndShift}
              >
                <LogOut size={16} /> Tamat Syif / Lepas Bilik
              </button>
            </div>

            {!pesakitAktif ? (
              <div className={styles.emptyPatientCard}>
                <p className={styles.emptyText}>
                  Tiada pesakit sedang dirawat di {bilikSemasa.nama_bilik}.
                </p>
                <button
                  type="button"
                  disabled={memproses || senaraiMenunggu.length === 0}
                  onClick={panggilPesakitSeterusnya}
                  className={styles.btnCallNext}
                >
                  <Bell size={18} /> Panggil Pesakit Seterusnya ({senaraiMenunggu.length})
                </button>
              </div>
            ) : (
              <div className={styles.patientActiveContainer}>
                {/* KAD PESAKIT AKTIF */}
                <div className={styles.patientInfoCard}>
                  <div className={styles.patientHeaderRow}>
                    <div>
                      <div className={styles.queuePill}>{pesakitAktif.no_giliran}</div>
                      <h2 className={styles.patientNameTitle}>
                        {pesakitAktif.pesakit?.nama || 'Pesakit Am'}
                      </h2>
                      <div className={styles.patientMetaRow}>
                        <span>IC: {pesakitAktif.pesakit?.no_ic || '-'}</span>
                        <span>Tel: {pesakitAktif.pesakit?.no_telefon || '-'}</span>
                      </div>
                    </div>

                    <div className={styles.patientActionButtons}>
                      {pesakitAktif.status === 'dipanggil' ? (
                        <button
                          type="button"
                          onClick={mulakanRawatan}
                          disabled={memproses}
                          style={{
                            backgroundColor: '#059669',
                            border: 'none',
                            color: '#ffffff',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.4)'
                          }}
                          title="Klik apabila pesakit telah masuk ke dalam bilik rawatan"
                        >
                          <Play size={14} fill="#ffffff" /> Mula Rawatan
                        </button>
                      ) : (
                        <div style={{
                          backgroundColor: 'rgba(5, 150, 105, 0.15)',
                          border: '1px solid #10b981',
                          color: '#34d399',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            display: 'inline-block',
                            boxShadow: '0 0 8px #10b981'
                          }}></span>
                          Sedang Merawat
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={panggilSemulaPesakit}
                        disabled={memproses}
                        className={styles.btnRecall}
                        title="Ulang panggilan audio di skrin TV dewan"
                      >
                        <Bell size={16} /> Panggil Semula
                      </button>

                      <button
                        type="button"
                        onClick={langkauPesakit}
                        disabled={memproses}
                        className={styles.btnSkip}
                        title="Kembalikan pesakit ke barisan giliran menunggu"
                      >
                        <SkipForward size={16} /> Langkau (Queue Balik)
                      </button>
                    </div>
                  </div>
                </div>

                {/* BORANG DIAGNOSTIK & RAWATAN */}
                <div className={styles.diagnosticGrid}>
                  <div className={styles.diagCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                        <Sparkles size={18} color="#38bdf8" /> 1. Reaksi Semasa Ruqyah
                      </h3>
                      <button
                        type="button"
                        onClick={() => setBukaInputTambahan(!bukaInputTambahan)}
                        style={{
                          backgroundColor: bukaInputTambahan ? '#334155' : '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '0.45rem',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {bukaInputTambahan ? <X size={13} /> : <PlusCircle size={13} />}
                        {bukaInputTambahan ? 'Batal' : '+ Maklumat Tambahan'}
                      </button>
                    </div>

                    {bukaInputTambahan && (
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '0.9rem',
                        padding: '0.65rem',
                        backgroundColor: '#1e293b',
                        borderRadius: '0.6rem',
                        border: '1px solid #334155'
                      }}>
                        <input
                          type="text"
                          placeholder="Masukkan reaksi/simptom khusus yang tiada di tag..."
                          value={inputTeksTambahan}
                          onChange={(e) => setInputTeksTambahan(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              tambahReaksiKustom();
                            }
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            color: '#ffffff',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.4rem',
                            fontSize: '0.82rem',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={tambahReaksiKustom}
                          style={{
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.4rem',
                            padding: '0.5rem 0.95rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          + Tambah
                        </button>
                      </div>
                    )}

                    <div className={styles.chipsContainer}>
                      {senaraiReaksiDB.map((reaksi) => {
                        const dipilih = reaksiDipilih.includes(reaksi);
                        const isNormal = reaksi.toLowerCase().includes('tiada sebarang reaksi') || reaksi.toLowerCase().includes('normal');
                        return (
                          <button
                            key={reaksi}
                            type="button"
                            className={`${styles.reaksiChip} ${dipilih ? styles.reaksiChipActive : ''} ${isNormal ? styles.reaksiChipFull : ''}`}
                            onClick={() => toggleReaksi(reaksi)}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                              {dipilih && <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>✓</span>}
                              {reaksi}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.diagCard}>
                    <h3 className={styles.sectionTitle}>
                      <Pill size={18} color="#34d399" /> 2. Penawar / Ubat Diberikan
                    </h3>

                    <div className={styles.medicineList}>
                      {senaraiBahan.map((bahan) => {
                        const itemAda = ubatDipilih.find((u) => u.id === bahan.id);
                        return (
                          <div key={bahan.id} className={styles.medicineRow}>
                            <div>
                              <div className={styles.medName}>{bahan.nama_item}</div>
                              <div className={styles.medPrice}>RM {Number(bahan.harga).toFixed(2)} / unit</div>
                            </div>

                            <div className={styles.medQtyControl}>
                              {itemAda ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => tolakItemUbat(bahan.id)}
                                    className={styles.btnQty}
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className={styles.qtyNumber}>{itemAda.kuantiti}</span>
                                  <button
                                    type="button"
                                    onClick={() => tambahItemUbat(bahan)}
                                    className={styles.btnQty}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => tambahItemUbat(bahan)}
                                  className={styles.btnAddMed}
                                >
                                  + Tambah
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.diagCard}>
                    <h3 className={styles.sectionTitle}>
                      <FileText size={18} color="#fbbf24" /> 3. Catatan Diagnostik & Amalan
                    </h3>
                    <textarea
                      rows={3}
                      className={styles.textareaField}
                      placeholder="cth: Pesakit dinasihatkan membaca Surah Al-Baqarah dan amalkan mandi ais bidara selama 3 hari berturut-turut..."
                      value={catatanRawatan}
                      onFocus={() => {
                        if (pesakitAktif && pesakitAktif.status === 'dipanggil') {
                          mulakanRawatan();
                        }
                      }}
                      onChange={(e) => {
                        if (pesakitAktif && pesakitAktif.status === 'dipanggil') {
                          mulakanRawatan();
                        }
                        setCatatanRawatan(e.target.value);
                      }}
                    />
                  </div>

                  <div className={styles.diagCard}>
                    <h3 className={styles.sectionTitle}>
                      <Calendar size={18} color="#a855f7" /> 4. Sijil Cuti Sakit (MC)
                    </h3>
                    <div className={styles.mcRow}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={perluMC}
                          onChange={(e) => {
                            if (pesakitAktif && pesakitAktif.status === 'dipanggil') {
                              mulakanRawatan();
                            }
                            setPerluMC(e.target.checked);
                          }}
                          className={styles.checkboxInput}
                        />
                        <span>Keluarkan Sijil Cuti Sakit (MC)</span>
                      </label>

                      {perluMC && (
                        <div className={styles.mcDaysRow}>
                          <span>Tempoh:</span>
                          <input
                            type="number"
                            min={1}
                            max={7}
                            value={bilanganHariMC}
                            onChange={(e) => setBilanganHariMC(parseInt(e.target.value, 10) || 1)}
                            className={styles.mcInput}
                          />
                          <span>Hari</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.bottomBarSubmit}>
                  <div>
                    <span className={styles.summaryLabel}>Jumlah Penawar:</span>
                    <span className={styles.summaryValue}>
                      {ubatDipilih.reduce((a, b) => a + b.kuantiti, 0)} item (RM {jumlahBayaranUbat.toFixed(2)})
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={memproses}
                    onClick={hantarKeFarmasi}
                    className={styles.btnSubmitPharmacy}
                  >
                    <Send size={18} /> Hantar ke Kaunter Bayaran & Farmasi
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}