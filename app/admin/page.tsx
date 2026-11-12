// app/admin/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';
import { 
  Package, 
  DollarSign, 
  PlusCircle, 
  Printer, 
  Layers, 
  Edit, 
  Trash2, 
  X, 
  LogOut, 
  Users, 
  Stethoscope, 
  UserCheck, 
  History, 
  Film, 
  Volume2, 
  Calendar, 
  TrendingUp, 
  DoorOpen, 
  Radio,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface BahanPenawar {
  id: string;
  nama_item: string;
  kategori: string;
  harga: number;
  stok_semasa: number;
  tahap_amaran: number;
}

interface Pesakit {
  id: string;
  nama: string;
  no_ic: string;
  no_telefon: string;
  alamat?: string;
  created_at: string;
}

interface Perawat {
  id: string;
  nama: string;
  no_bilik: string;
  no_ic?: string;
  no_telefon?: string;
  kelayakan?: string;
  bidang_khusus?: string;
  tarikh_mula?: string;
  status_aktif: boolean;
}

interface AdminProfil {
  id: string;
  nama: string;
  email: string;
  peranan: 'super_admin' | 'admin_pesakit' | 'admin_kewangan_inventori';
  created_at?: string;
}

interface VideoTV {
  id: string;
  tajuk: string;
  url_video: string;
  jenis: 'youtube' | 'mp4';
  loop_tunggal: boolean;
  kelantangan_audio: number;
  status_aktif: boolean;
  created_at: string;
}

interface BilikRawatanAdmin {
  id: number;
  nama_bilik: string;
  perawat_semasa_id: string | null;
  sesi: string | null;
  status: string;
  status_aktif: boolean;
  perawat?: { nama: string };
}

interface ItemTickerAdmin {
  id: string;
  teks_arab?: string | null;
  teks_maksud: string;
  rujukan?: string | null;
  kategori?: string;
  turutan?: number;
  status_aktif: boolean;
  created_at?: string;
}

interface ReaksiRuqyahAdmin {
  id: string;
  nama_reaksi: string;
  keterangan?: string | null;
  status_aktif: boolean;
  turutan?: number;
  created_at?: string;
}

export default function PapanPemukaAdmin() {
  const router = useRouter();
  const [sedangSemakSesi, setSedangSemakSesi] = useState(true);
  const [profilAdmin, setProfilAdmin] = useState<AdminProfil | null>(null);

  // Tab Utama
  const [tabAktif, setTabAktif] = useState<string>('kewangan');
  const [subTabInventori, setSubTabInventori] = useState<'baki' | 'masuk' | 'keluar' | 'semua'>('baki');

  // Penapis & Data Kewangan Dinamik
  const [tempohKewanganPilihan, setTempohKewanganPilihan] = useState<'hari' | 'minggu' | 'bulan' | 'total'>('hari');
  const [semuaTransaksiMasuk, setSemuaTransaksiMasuk] = useState<any[]>([]);

  // Data Inventori
  const [senaraiBahan, setSenaraiBahan] = useState<BahanPenawar[]>([]);
  const [senaraiLog, setSenaraiLog] = useState<any[]>([]);
  const [bahanPilihanId, setBahanPilihanId] = useState('');
  const [kuantitiTambah, setKuantitiTambah] = useState('');
  const [catatanStok, setCatatanStok] = useState('');
  const [selectedBahan, setSelectedBahan] = useState<string[]>([]);

  // Data Pesakit & Carian
  const [senaraiPesakit, setSenaraiPesakit] = useState<Pesakit[]>([]);
  const [carianPesakit, setCarianPesakit] = useState('');
  const [pesakitDiedit, setPesakitDiedit] = useState<Pesakit | null>(null);
  const [pesakitGarisMasa, setPesakitGarisMasa] = useState<any | null>(null);
  const [sejarahSesi, setSejarahSesi] = useState<any[]>([]);
  const [selectedPesakit, setSelectedPesakit] = useState<string[]>([]);

  // Data Portfolio Perawat
  const [senaraiPerawat, setSenaraiPerawat] = useState<Perawat[]>([]);
  const [bukaModalPerawat, setBukaModalPerawat] = useState(false);
  const [perawatDiedit, setPerawatDiedit] = useState<Perawat | null>(null);
  const [selectedPerawat, setSelectedPerawat] = useState<string[]>([]);

  // Data Kawalan Bilik Rawatan
  const [senaraiBilik, setSenaraiBilik] = useState<BilikRawatanAdmin[]>([]);
  const [bukaModalBilik, setBukaModalBilik] = useState(false);
  const [bilikDiedit, setBilikDiedit] = useState<BilikRawatanAdmin | null>(null);
  const [formNamaBilik, setFormNamaBilik] = useState('');
  const [selectedBilik, setSelectedBilik] = useState<number[]>([]);

  // Data Pengurusan Reaksi Ruqyah (CRUD)
  const [senaraiReaksi, setSenaraiReaksi] = useState<ReaksiRuqyahAdmin[]>([]);
  const [bukaModalReaksi, setBukaModalReaksi] = useState(false);
  const [reaksiDiedit, setReaksiDiedit] = useState<ReaksiRuqyahAdmin | null>(null);
  const [formNamaReaksi, setFormNamaReaksi] = useState('');
  const [formKeteranganReaksi, setFormKeteranganReaksi] = useState('');
  const [selectedReaksi, setSelectedReaksi] = useState<string[]>([]);

  // Data Siaran Video TV
  const [senaraiVideo, setSenaraiVideo] = useState<VideoTV[]>([]);
  const [bukaModalVideo, setBukaModalVideo] = useState(false);
  const [videoDiedit, setVideoDiedit] = useState<VideoTV | null>(null);
  const [formTajukVideo, setFormTajukVideo] = useState('');
  const [formUrlVideo, setFormUrlVideo] = useState('');
  const [formJenisVideo, setFormJenisVideo] = useState<'youtube' | 'mp4'>('youtube');
  const [formLoopVideo, setFormLoopVideo] = useState(false);
  const [formKelantangan, setFormKelantangan] = useState(20);
  const [selectedVideo, setSelectedVideo] = useState<string[]>([]);

  // Data Siaran Ticker TV
  const [senaraiTicker, setSenaraiTicker] = useState<ItemTickerAdmin[]>([]);
  const [bukaModalTicker, setBukaModalTicker] = useState(false);
  const [tickerDiedit, setTickerDiedit] = useState<ItemTickerAdmin | null>(null);
  const [formTeksArab, setFormTeksArab] = useState('');
  const [formTeksMaksud, setFormTeksMaksud] = useState('');
  const [formRujukan, setFormRujukan] = useState('');
  const [formKategoriTicker, setFormKategoriTicker] = useState('makluman');
  const [formTurutanTicker, setFormTurutanTicker] = useState('1');

  // Data Lantikan Admin
  const [senaraiSemuaAdmin, setSenaraiSemuaAdmin] = useState<AdminProfil[]>([]);
  const [bukaModalAdmin, setBukaModalAdmin] = useState(false);
  const [adminNama, setAdminNama] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPeranan, setAdminPeranan] = useState<'admin_pesakit' | 'admin_kewangan_inventori'>('admin_pesakit');
  const [selectedAdmin, setSelectedAdmin] = useState<string[]>([]);

  // Modal State CRUD Inventori
  const [bukaModalTambahBahan, setBukaModalTambahBahan] = useState(false);
  const [itemDiedit, setItemDiedit] = useState<BahanPenawar | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState('penawar');
  const [formHarga, setFormHarga] = useState('');
  const [formStokAwal, setFormStokAwal] = useState('');
  const [formTahapAmaran, setFormTahapAmaran] = useState('10');

  const [memproses, setMemproses] = useState(false);

  // 1. Semakan Sesi Pentadbir
  useEffect(() => {
    const semakPengesahan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin/login');
        return;
      }

      const { data: profil } = await supabase
        .from('admin_profil')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profil) {
        setProfilAdmin(profil);
        if (profil.peranan === 'admin_pesakit') {
          setTabAktif('pesakit');
        } else {
          setTabAktif('kewangan');
        }
      } else {
        setProfilAdmin({
          id: session.user.id,
          nama: 'Pentadbir',
          email: session.user.email || '',
          peranan: 'super_admin'
        });
        setTabAktif('kewangan');
      }

      setSedangSemakSesi(false);
    };

    semakPengesahan();
  }, [router]);

  const tanganiLogKeluar = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  // 2. Muat Semua Data Transaksi Masuk
  const muatDataKewangan = async () => {
    try {
      let { data: dataSemuaMasuk, error } = await supabase
        .from('lejar_kewangan')
        .select('*, pesakit(nama, no_ic)')
        .order('created_at', { ascending: false });

      if (error) {
        const fallback = await supabase
          .from('lejar_kewangan')
          .select('*')
          .order('id', { ascending: false });
        dataSemuaMasuk = fallback.data;
      }

      if (dataSemuaMasuk) {
        const hanyaMasuk = dataSemuaMasuk.filter(
          (trx: any) => !trx.jenis_transaksi || String(trx.jenis_transaksi).toLowerCase() !== 'keluar'
        );
        setSemuaTransaksiMasuk(hanyaMasuk);
      }
    } catch (err) {
      console.warn('Ralat memuat data kewangan:', err);
    }
  };

  // Helper Penukaran Tarikh Waktu Malaysia (GMT+8)
  const formatTarikhMY = (input?: string | Date): string => {
    const d = input ? new Date(input) : new Date();
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };

  const normalisasiTarikhStr = (str: string): string => {
    const bersih = str.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(bersih)) return bersih.slice(0, 10);
    if (bersih.includes('/')) {
      const [d, m, y] = bersih.split('/');
      if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return '';
  };

  const ekstrakTarikhTrxMY = (trx: any): string => {
    if (trx.created_at) {
      const dariCreated = formatTarikhMY(trx.created_at);
      if (dariCreated) return dariCreated;
    }
    if (trx.tarikh) {
      return normalisasiTarikhStr(String(trx.tarikh));
    }
    return '';
  };

  const isTransaksiHariIni = (trx: any, targetHariIni: string): boolean => {
    if (trx.created_at && formatTarikhMY(trx.created_at) === targetHariIni) return true;
    if (trx.tarikh && normalisasiTarikhStr(String(trx.tarikh)) === targetHariIni) return true;
    return false;
  };

  // 3. Pengiraan Tarikh & Penapis Transaksi Dinamik (Waktu Malaysia)
  const tarikhHariIni = formatTarikhMY();

  const tarikhMulaMinggu = useMemo(() => {
    const [y, m, d] = tarikhHariIni.split('-').map(Number);
    const lokal = new Date(y, m - 1, d);
    const day = lokal.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    lokal.setDate(lokal.getDate() + diff);
    return `${lokal.getFullYear()}-${String(lokal.getMonth() + 1).padStart(2, '0')}-${String(lokal.getDate()).padStart(2, '0')}`;
  }, [tarikhHariIni]);

  const tarikhMulaBulan = useMemo(() => {
    return `${tarikhHariIni.slice(0, 7)}-01`;
  }, [tarikhHariIni]);

  // Kiraan Ringkasan 4 Kad Utama (Perakaunan Tepat Tanpa Pengiraan Berganda)
  const ringkasanKutipan = useMemo(() => {
    let hariIni = 0;
    let mingguIni = 0;
    let bulanIni = 0;
    let totalKutipan = 0;

    semuaTransaksiMasuk.forEach((trx) => {
      const val = Number(trx.jumlah) || 0;
      const t = ekstrakTarikhTrxMY(trx);

      totalKutipan += val;
      if (isTransaksiHariIni(trx, tarikhHariIni)) hariIni += val;
      if (t >= tarikhMulaMinggu) mingguIni += val;
      if (t >= tarikhMulaBulan) bulanIni += val;
    });

    return { hariIni, mingguIni, bulanIni, totalKutipan };
  }, [semuaTransaksiMasuk, tarikhHariIni, tarikhMulaMinggu, tarikhMulaBulan]);

  // Transaksi Ditapis Mengikut Kad Yang Dipilih
  const transaksiDitapis = useMemo(() => {
    return semuaTransaksiMasuk.filter((trx) => {
      const t = ekstrakTarikhTrxMY(trx);
      if (tempohKewanganPilihan === 'hari') return isTransaksiHariIni(trx, tarikhHariIni);
      if (tempohKewanganPilihan === 'minggu') return t >= tarikhMulaMinggu;
      if (tempohKewanganPilihan === 'bulan') return t >= tarikhMulaBulan;
      return true;
    });
  }, [semuaTransaksiMasuk, tempohKewanganPilihan, tarikhHariIni, tarikhMulaMinggu, tarikhMulaBulan]);

  // Pecahan Kutipan (Tunai / QR / Resit) Mengikut Kad Yang Aktif
  const pecahanKutipanAktif = useMemo(() => {
    let tunai = 0;
    let qr = 0;

    transaksiDitapis.forEach((trx) => {
      const val = Number(trx.jumlah) || 0;
      if (trx.kaedah_bayaran === 'tunai') tunai += val;
      if (trx.kaedah_bayaran === 'duitnow_qr') qr += val;
    });

    return {
      tunai,
      qr,
      bilanganResit: transaksiDitapis.length
    };
  }, [transaksiDitapis]);

  // Muat Data Modul Lain
  const muatDataInventori = async () => {
    const { data: bahan } = await supabase
      .from('bahan_penawar')
      .select('*')
      .order('nama_item', { ascending: true });
    if (bahan) {
      setSenaraiBahan(bahan);
      if (bahan.length > 0 && !bahanPilihanId) setBahanPilihanId(bahan[0].id);
    }

    const { data: log } = await supabase
      .from('inventori_log')
      .select('*, bahan_penawar(nama_item)')
      .order('created_at', { ascending: false });
    if (log) setSenaraiLog(log);
  };

  const muatDataPesakit = async () => {
    const { data } = await supabase
      .from('pesakit')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSenaraiPesakit(data);
  };

  const muatDataPerawat = async () => {
    const { data } = await supabase
      .from('perawat')
      .select('*')
      .order('id', { ascending: true });
    if (data) setSenaraiPerawat(data);
  };

  const muatDataBilik = async () => {
    const { data } = await supabase
      .from('bilik_rawatan')
      .select('*, perawat(nama)')
      .order('id', { ascending: true });
    if (data) setSenaraiBilik(data);
  };

  const muatDataReaksi = async () => {
    const { data } = await supabase
      .from('reaksi_ruqyah')
      .select('*')
      .order('turutan', { ascending: true })
      .order('nama_reaksi', { ascending: true });
    if (data) setSenaraiReaksi(data);
  };

  const muatDataVideo = async () => {
    const { data } = await supabase
      .from('video_tv')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSenaraiVideo(data);
  };

  const muatDataTicker = async () => {
    const { data } = await supabase
      .from('pengumuman_ticker')
      .select('*')
      .order('turutan', { ascending: true })
      .order('created_at', { ascending: false });
    if (data) setSenaraiTicker(data);
  };

  const muatDataAdmin = async () => {
    const { data } = await supabase
      .from('admin_profil')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSenaraiSemuaAdmin(data);
  };

  useEffect(() => {
    if (!sedangSemakSesi && profilAdmin) {
      const bolehKewangan = profilAdmin.peranan === 'super_admin' || profilAdmin.peranan === 'admin_kewangan_inventori';

      if (bolehKewangan) {
        muatDataKewangan();
        muatDataInventori();
      }
      if (profilAdmin.peranan === 'super_admin' || profilAdmin.peranan === 'admin_pesakit') {
        muatDataPesakit();
      }
      if (profilAdmin.peranan === 'super_admin') {
        muatDataPerawat();
        muatDataBilik();
        muatDataReaksi();
        muatDataVideo();
        muatDataTicker();
        muatDataAdmin();
      }

      const intervalKewangan = bolehKewangan
        ? setInterval(() => {
            muatDataKewangan();
          }, 4000)
        : null;

      const saluranKewangan = supabase
        .channel('admin_kewangan_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lejar_kewangan' }, () => {
          muatDataKewangan();
        })
        .subscribe();

      return () => {
        if (intervalKewangan) clearInterval(intervalKewangan);
        supabase.removeChannel(saluranKewangan);
      };
    }
  }, [sedangSemakSesi, profilAdmin]);

  // A. Tindakan Inventori
  const toggleSelectAllBahan = () => {
    if (selectedBahan.length === senaraiBahan.length) {
      setSelectedBahan([]);
    } else {
      setSelectedBahan(senaraiBahan.map((b) => b.id));
    }
  };

  const toggleSelectBahan = (id: string) => {
    setSelectedBahan((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const padamBahanPukal = async () => {
    setMemproses(true);
    try {
      const { error } = await supabase.from('bahan_penawar').delete().in('id', selectedBahan);
      if (error) throw error;
      setSelectedBahan([]);
      muatDataInventori();
    } finally {
      setMemproses(false);
    }
  };

  // B. Tindakan Pesakit
  const senaraiPesakitDitapis = senaraiPesakit.filter(
    (p) =>
      p.nama.toLowerCase().includes(carianPesakit.toLowerCase()) ||
      p.no_ic.includes(carianPesakit) ||
      p.no_telefon.includes(carianPesakit)
  );

  const toggleSelectAllPesakit = () => {
    if (selectedPesakit.length === senaraiPesakitDitapis.length) {
      setSelectedPesakit([]);
    } else {
      setSelectedPesakit(senaraiPesakitDitapis.map((p) => p.id));
    }
  };

  const toggleSelectPesakit = (id: string) => {
    setSelectedPesakit((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const padamPesakitPukal = async () => {
    setMemproses(true);
    try {
      const { error } = await supabase.from('pesakit').delete().in('id', selectedPesakit);
      if (error) throw error;
      setSelectedPesakit([]);
      muatDataPesakit();
    } finally {
      setMemproses(false);
    }
  };

  // C. Tindakan Perawat
  const toggleSelectAllPerawat = () => {
    if (selectedPerawat.length === senaraiPerawat.length) {
      setSelectedPerawat([]);
    } else {
      setSelectedPerawat(senaraiPerawat.map((u) => u.id));
    }
  };

  const toggleSelectPerawat = (id: string) => {
    setSelectedPerawat((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const padamPerawatPukal = async () => {
    setMemproses(true);
    try {
      const { error } = await supabase.from('perawat').delete().in('id', selectedPerawat);
      if (error) throw error;
      setSelectedPerawat([]);
      muatDataPerawat();
    } finally {
      setMemproses(false);
    }
  };

  // D. Tindakan Kawalan Bilik Rawatan
  const toggleSelectAllBilik = () => {
    if (selectedBilik.length === senaraiBilik.length) {
      setSelectedBilik([]);
    } else {
      setSelectedBilik(senaraiBilik.map((b) => b.id));
    }
  };

  const toggleSelectBilik = (id: number) => {
    setSelectedBilik((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const padamBilikPukal = async () => {
    if (selectedBilik.length === 0) return;
    setMemproses(true);
    try {
      const { error } = await supabase.from('bilik_rawatan').delete().in('id', selectedBilik);
      if (error) throw error;
      setSelectedBilik([]);
      await muatDataBilik();
    } catch (err: any) {
      alert('Ralat memadam bilik: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const tanganiPadamSatuBilik = async (id: number) => {
    setMemproses(true);
    try {
      const { error } = await supabase.from('bilik_rawatan').delete().eq('id', id);
      if (error) throw error;
      setSelectedBilik((prev) => prev.filter((item) => item !== id));
      await muatDataBilik();
    } catch (err: any) {
      alert('Ralat memadam bilik: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const kosongkanBilik = async (id: number) => {
    setMemproses(true);
    try {
      await supabase.from('bilik_rawatan').update({
        perawat_semasa_id: null,
        status: 'kosong',
        sesi: null,
        waktu_check_in: null
      }).eq('id', id);
      muatDataBilik();
    } finally {
      setMemproses(false);
    }
  };

  const toggleStatusAktifBilik = async (bilik: BilikRawatanAdmin) => {
    setMemproses(true);
    try {
      await supabase.from('bilik_rawatan').update({
        status_aktif: !bilik.status_aktif
      }).eq('id', bilik.id);
      muatDataBilik();
    } finally {
      setMemproses(false);
    }
  };

  const simpanBilik = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaBilik.trim()) return;
    setMemproses(true);
    try {
      if (bilikDiedit) {
        const { error } = await supabase
          .from('bilik_rawatan')
          .update({
            nama_bilik: formNamaBilik.trim()
          })
          .eq('id', bilikDiedit.id);

        if (error) throw error;
        alert('Bilik rawatan berjaya dikemaskini!');
      } else {
        const { error } = await supabase.from('bilik_rawatan').insert({
          nama_bilik: formNamaBilik.trim(),
          status: 'kosong',
          status_aktif: true
        });

        if (error) throw error;
        alert('Bilik rawatan baharu didaftarkan!');
      }

      setBukaModalBilik(false);
      setBilikDiedit(null);
      setFormNamaBilik('');
      muatDataBilik();
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // E. Tindakan Reaksi Ruqyah (CRUD Penuh)
  const toggleSelectAllReaksi = () => {
    if (selectedReaksi.length === senaraiReaksi.length) {
      setSelectedReaksi([]);
    } else {
      setSelectedReaksi(senaraiReaksi.map((r) => r.id));
    }
  };

  const toggleSelectReaksi = (id: string) => {
    setSelectedReaksi((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleStatusReaksi = async (r: ReaksiRuqyahAdmin) => {
    setMemproses(true);
    try {
      await supabase.from('reaksi_ruqyah').update({
        status_aktif: !r.status_aktif
      }).eq('id', r.id);
      muatDataReaksi();
    } finally {
      setMemproses(false);
    }
  };

  const tanganiPadamSatuReaksi = async (id: string) => {
    setMemproses(true);
    try {
      await supabase.from('reaksi_ruqyah').delete().eq('id', id);
      setSelectedReaksi((prev) => prev.filter((item) => item !== id));
      muatDataReaksi();
    } catch (err: any) {
      alert('Ralat memadam reaksi: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const padamReaksiPukal = async () => {
    if (selectedReaksi.length === 0) return;
    setMemproses(true);
    try {
      await supabase.from('reaksi_ruqyah').delete().in('id', selectedReaksi);
      setSelectedReaksi([]);
      muatDataReaksi();
    } catch (err: any) {
      alert('Ralat memadam reaksi: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const simpanReaksi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaReaksi.trim()) return;

    setMemproses(true);
    try {
      if (reaksiDiedit) {
        const { error } = await supabase.from('reaksi_ruqyah').update({
          nama_reaksi: formNamaReaksi.trim(),
          keterangan: formKeteranganReaksi.trim() || null
        }).eq('id', reaksiDiedit.id);

        if (error) throw error;
        alert('Reaksi ruqyah berjaya dikemaskini!');
      } else {
        const { error } = await supabase.from('reaksi_ruqyah').insert({
          nama_reaksi: formNamaReaksi.trim(),
          keterangan: formKeteranganReaksi.trim() || null,
          status_aktif: true,
          turutan: senaraiReaksi.length + 1
        });

        if (error) throw error;
        alert('Reaksi ruqyah baharu berjaya ditambah!');
      }

      setBukaModalReaksi(false);
      setReaksiDiedit(null);
      setFormNamaReaksi('');
      setFormKeteranganReaksi('');
      muatDataReaksi();
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // F. Video TV (Tambah, Edit & Padam)
  const toggleSelectAllVideo = () => {
    if (selectedVideo.length === senaraiVideo.length) {
      setSelectedVideo([]);
    } else {
      setSelectedVideo(senaraiVideo.map((v) => v.id));
    }
  };

  const toggleSelectVideo = (id: string) => {
    setSelectedVideo((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const tanganiPadamSatuVideo = async (id: string) => {
    setMemproses(true);
    try {
      await supabase.from('video_tv').delete().eq('id', id);
      muatDataVideo();
    } finally {
      setMemproses(false);
    }
  };

  const padamVideoPukal = async () => {
    setMemproses(true);
    try {
      await supabase.from('video_tv').delete().in('id', selectedVideo);
      setSelectedVideo([]);
      muatDataVideo();
    } finally {
      setMemproses(false);
    }
  };

  const simpanVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTajukVideo.trim() || !formUrlVideo.trim()) return;

    setMemproses(true);
    try {
      const jenisAuto = formUrlVideo.includes('.mp4') ? 'mp4' : formJenisVideo;

      if (videoDiedit) {
        const { error } = await supabase.from('video_tv').update({
          tajuk: formTajukVideo.trim(),
          url_video: formUrlVideo.trim(),
          jenis: jenisAuto,
          loop_tunggal: formLoopVideo,
          kelantangan_audio: formKelantangan
        }).eq('id', videoDiedit.id);

        if (error) throw error;
        alert('Video siaran TV berjaya dikemaskini!');
      } else {
        const { error } = await supabase.from('video_tv').insert({
          tajuk: formTajukVideo.trim(),
          url_video: formUrlVideo.trim(),
          jenis: jenisAuto,
          loop_tunggal: formLoopVideo,
          kelantangan_audio: formKelantangan,
          status_aktif: true
        });

        if (error) throw error;
        alert('Video siaran TV berjaya ditambah!');
      }

      setBukaModalVideo(false);
      setVideoDiedit(null);
      setFormTajukVideo('');
      setFormUrlVideo('');
      setFormLoopVideo(false);
      setFormKelantangan(20);
      muatDataVideo();
    } catch (err: any) {
      alert('Ralat menyimpan video: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // G. Siaran Ticker TV (Tambah, Edit, Toggle & Padam)
  const simpanTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeksMaksud.trim()) return;

    setMemproses(true);
    try {
      if (tickerDiedit) {
        const { error } = await supabase.from('pengumuman_ticker').update({
          teks_arab: formTeksArab.trim() || null,
          teks_maksud: formTeksMaksud.trim(),
          rujukan: formRujukan.trim() || null,
          kategori: formKategoriTicker,
          turutan: parseInt(formTurutanTicker, 10) || 1
        }).eq('id', tickerDiedit.id);

        if (error) throw error;
        alert('Makluman ticker dikemaskini!');
      } else {
        const { error } = await supabase.from('pengumuman_ticker').insert({
          teks_arab: formTeksArab.trim() || null,
          teks_maksud: formTeksMaksud.trim(),
          rujukan: formRujukan.trim() || null,
          kategori: formKategoriTicker,
          turutan: parseInt(formTurutanTicker, 10) || 1,
          status_aktif: true
        });

        if (error) throw error;
        alert('Makluman ticker baharu berjaya ditambah!');
      }

      setBukaModalTicker(false);
      setTickerDiedit(null);
      setFormTeksArab('');
      setFormTeksMaksud('');
      setFormRujukan('');
      setFormKategoriTicker('makluman');
      setFormTurutanTicker('1');
      muatDataTicker();
    } catch (err: any) {
      alert('Ralat simpan ticker: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const toggleStatusTicker = async (t: ItemTickerAdmin) => {
    setMemproses(true);
    try {
      await supabase.from('pengumuman_ticker').update({
        status_aktif: !t.status_aktif
      }).eq('id', t.id);
      muatDataTicker();
    } finally {
      setMemproses(false);
    }
  };

  const padamTicker = async (id: string) => {
    setMemproses(true);
    try {
      await supabase.from('pengumuman_ticker').delete().eq('id', id);
      muatDataTicker();
    } finally {
      setMemproses(false);
    }
  };

  // H. Admin
  const adminBolehDipadam = senaraiSemuaAdmin.filter((a) => a.id !== profilAdmin?.id);

  const toggleSelectAllAdmin = () => {
    if (selectedAdmin.length === adminBolehDipadam.length) {
      setSelectedAdmin([]);
    } else {
      setSelectedAdmin(adminBolehDipadam.map((a) => a.id));
    }
  };

  const toggleSelectAdmin = (id: string) => {
    setSelectedAdmin((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const padamAdminPukal = async () => {
    setMemproses(true);
    try {
      const { error } = await supabase.from('admin_profil').delete().in('id', selectedAdmin);
      if (error) throw error;
      setSelectedAdmin([]);
      muatDataAdmin();
    } finally {
      setMemproses(false);
    }
  };

  // Garis Masa Pesakit
  const bukaGarisMasaPesakit = async (pesakit: Pesakit) => {
    setPesakitGarisMasa(pesakit);
    const { data: sesi } = await supabase
      .from('sesi_rawatan')
      .select('*, perawat(nama, no_bilik)')
      .eq('pesakit_id', pesakit.id)
      .order('created_at', { ascending: false });
    setSejarahSesi(sesi || []);
  };

  const simpanKemaskiniPesakit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pesakitDiedit) return;
    setMemproses(true);

    try {
      await supabase.from('pesakit').update({
        nama: pesakitDiedit.nama.trim(),
        no_ic: pesakitDiedit.no_ic.trim(),
        no_telefon: pesakitDiedit.no_telefon.trim(),
        alamat: pesakitDiedit.alamat?.trim() || null
      }).eq('id', pesakitDiedit.id);

      alert('Profil pesakit berjaya dikemaskini!');
      setPesakitDiedit(null);
      muatDataPesakit();
    } finally {
      setMemproses(false);
    }
  };

  const simpanPerawat = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemproses(true);

    try {
      if (perawatDiedit && perawatDiedit.id) {
        await supabase.from('perawat').update({
          nama: perawatDiedit.nama,
          no_bilik: '-',
          no_ic: perawatDiedit.no_ic,
          no_telefon: perawatDiedit.no_telefon,
          kelayakan: perawatDiedit.kelayakan,
          bidang_khusus: perawatDiedit.bidang_khusus,
          status_aktif: perawatDiedit.status_aktif
        }).eq('id', perawatDiedit.id);
        alert('Maklumat perawat dikemaskini!');
      } else if (perawatDiedit) {
        await supabase.from('perawat').insert({
          nama: perawatDiedit.nama,
          no_bilik: '-',
          no_ic: perawatDiedit.no_ic,
          no_telefon: perawatDiedit.no_telefon,
          kelayakan: perawatDiedit.kelayakan,
          bidang_khusus: perawatDiedit.bidang_khusus,
          status_aktif: true
        });
        alert('Perawat baharu didaftarkan!');
      }
      setPerawatDiedit(null);
      setBukaModalPerawat(false);
      muatDataPerawat();
    } finally {
      setMemproses(false);
    }
  };

  const ciptaAdminBaharu = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemproses(true);

    try {
      const res = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: adminNama,
          email: adminEmail,
          password: adminPassword,
          peranan: adminPeranan
        })
      });

      const hasil = await res.json();
      if (!res.ok) throw new Error(hasil.ralat || 'Gagal melantik admin');

      alert(hasil.mesej);
      setBukaModalAdmin(false);
      setAdminNama('');
      setAdminEmail('');
      setAdminPassword('');
      muatDataAdmin();
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const masukkanStok = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(kuantitiTambah, 10);
    if (!bahanPilihanId || !qty || qty <= 0) return alert('Kuantiti tidak sah.');
    setMemproses(true);
    try {
      const bahan = senaraiBahan.find((b) => b.id === bahanPilihanId);
      const bakiBaru = (bahan?.stok_semasa || 0) + qty;
      await supabase.from('bahan_penawar').update({ stok_semasa: bakiBaru }).eq('id', bahanPilihanId);
      await supabase.from('inventori_log').insert({
        bahan_id: bahanPilihanId,
        jenis_pergerakan: 'masuk',
        kuantiti: qty,
        baki_selepas: bakiBaru,
        catatan: catatanStok.trim() || 'Stok masuk oleh pentadbir'
      });
      setKuantitiTambah('');
      setCatatanStok('');
      muatDataInventori();
      alert(`Stok ditambah. Baki terkini: ${bakiBaru}`);
    } finally {
      setMemproses(false);
    }
  };

  const simpanItemBaharu = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemproses(true);
    try {
      await supabase.from('bahan_penawar').insert({
        nama_item: formNama.trim(),
        kategori: formKategori,
        harga: parseFloat(formHarga) || 0,
        stok_semasa: parseInt(formStokAwal, 10) || 0,
        tahap_amaran: parseInt(formTahapAmaran, 10) || 10
      });
      setBukaModalTambahBahan(false);
      muatDataInventori();
    } finally {
      setMemproses(false);
    }
  };

  const simpanKemaskiniItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDiedit) return;
    setMemproses(true);
    try {
      await supabase.from('bahan_penawar').update({
        nama_item: formNama.trim(),
        kategori: formKategori,
        harga: parseFloat(formHarga) || 0,
        stok_semasa: parseInt(formStokAwal, 10) || 0,
        tahap_amaran: parseInt(formTahapAmaran, 10) || 10
      }).eq('id', itemDiedit.id);
      setItemDiedit(null);
      muatDataInventori();
    } finally {
      setMemproses(false);
    }
  };

  if (sedangSemakSesi) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0b1120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Menyemak kelayakan pentadbir...</p>
      </div>
    );
  }

  const isSuper = profilAdmin?.peranan === 'super_admin';
  const isKewangan = isSuper || profilAdmin?.peranan === 'admin_kewangan_inventori';
  const isPesakit = isSuper || profilAdmin?.peranan === 'admin_pesakit';

  const labelTempoh = {
    hari: 'Hari Ini',
    minggu: 'Minggu Ini',
    bulan: 'Bulan Ini',
    total: 'Keseluruhan (Semua Bulan)'
  }[tempohKewanganPilihan];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b1120', width: '100%', padding: '1.5rem', boxSizing: 'border-box' }}>
      {/* GAYA CETAKAN RASMI A4 */}
      <style dangerouslySetInnerHTML={{ __html: `
        #print-financial-report {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            font-size: 10pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .screen-only-wrapper {
            display: none !important;
          }
          #print-financial-report {
            display: block !important;
            width: 100% !important;
            color: #0f172a !important;
            background: #ffffff !important;
          }
          .print-header-box {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .print-clinic-name {
            font-size: 15pt;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            letter-spacing: 0.5px;
          }
          .print-doc-title {
            font-size: 10pt;
            font-weight: 600;
            color: #475569;
            margin: 3px 0 0 0;
            text-transform: uppercase;
          }
          .print-meta-grid {
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
            color: #64748b;
            margin-top: 6px;
          }
          .print-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 15px;
          }
          .print-summary-card {
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            padding: 6px 8px;
            background-color: #f8fafc;
          }
          .print-summary-label {
            font-size: 7.5pt;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
          }
          .print-summary-value {
            font-size: 11pt;
            font-weight: 600;
            color: #0f172a;
            margin-top: 2px;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
          }
          .print-table th {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            font-weight: 600;
            text-align: left;
            color: #1e293b;
          }
          .print-table td {
            border: 1px solid #e2e8f0;
            padding: 5px 7px;
            color: #334155;
          }
          .print-signatures {
            margin-top: 35px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .print-sig-box {
            width: 180px;
            text-align: center;
            font-size: 8.5pt;
          }
          .print-sig-line {
            border-bottom: 1px solid #0f172a;
            margin-top: 45px;
            margin-bottom: 4px;
          }
        }
      `}} />

      {/* DOKUMEN CETAKAN KHAS */}
      <div id="print-financial-report">
        <div className="print-header-box">
          <h1 className="print-clinic-name">PUSAT RAWATAN ISLAM DARUL SYIFA&apos;</h1>
          <p className="print-doc-title">Laporan Penyata Kutipan &amp; Aliran Tunai ({labelTempoh})</p>
          <div className="print-meta-grid">
            <span>Tarikh: {new Date().toLocaleDateString('ms-MY')} {new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Pegawai: {profilAdmin?.nama} ({profilAdmin?.peranan.replace(/_/g, ' ')})</span>
          </div>
        </div>

        <div className="print-summary-grid">
          <div className="print-summary-card">
            <div className="print-summary-label">Kutipan ({labelTempoh})</div>
            <div className="print-summary-value">
              RM {(pecahanKutipanAktif.tunai + pecahanKutipanAktif.qr).toFixed(2)}
            </div>
          </div>
          <div className="print-summary-card">
            <div className="print-summary-label">Kutipan Tunai</div>
            <div className="print-summary-value">RM {pecahanKutipanAktif.tunai.toFixed(2)}</div>
          </div>
          <div className="print-summary-card">
            <div className="print-summary-label">DuitNow QR</div>
            <div className="print-summary-value">RM {pecahanKutipanAktif.qr.toFixed(2)}</div>
          </div>
          <div className="print-summary-card">
            <div className="print-summary-label">Bilangan Resit</div>
            <div className="print-summary-value">{pecahanKutipanAktif.bilanganResit} Resit</div>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '35px', textAlign: 'center' }}>No.</th>
              <th>No. Resit</th>
              <th>Tarikh &amp; Masa</th>
              <th>Nama Pesakit</th>
              <th>No. K/P</th>
              <th>Kaedah</th>
              <th style={{ textAlign: 'right' }}>Jumlah (RM)</th>
            </tr>
          </thead>
          <tbody>
            {transaksiDitapis.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '12px' }}>
                  Tiada rekod transaksi bagi tempoh {labelTempoh}.
                </td>
              </tr>
            ) : (
              transaksiDitapis.map((trx, idx) => (
                <tr key={trx.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>{trx.no_resit}</td>
                  <td>{trx.created_at ? `${new Date(trx.created_at).toLocaleDateString('ms-MY')} ${new Date(trx.created_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}` : (trx.tarikh || '-')}</td>
                  <td>{trx.pesakit?.nama || 'Pesakit Am'}</td>
                  <td>{trx.pesakit?.no_ic || '-'}</td>
                  <td>{trx.kaedah_bayaran === 'tunai' ? 'Tunai' : 'DuitNow QR'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>RM {Number(trx.jumlah).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="print-signatures">
          <div className="print-sig-box">
            <div className="print-sig-line"></div>
            <strong>Disediakan Oleh</strong>
            <div>Pegawai Farmasi / Kewangan</div>
          </div>
          <div className="print-sig-box">
            <div className="print-sig-line"></div>
            <strong>Disahkan Oleh</strong>
            <div>Pengurus / Tabib Kanan</div>
          </div>
        </div>
      </div>

      {/* PAPARAN SKRIN SISTEM */}
      <div className="screen-only-wrapper" style={{ width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Menu Utama
          </Link>
        </div>

        <header className={styles.header} style={{ marginBottom: '1.25rem' }}>
          <div>
            <h1 className={styles.title} style={{ fontWeight: 600, fontSize: '1.35rem' }}>
              <Layers size={24} /> Pusat Pentadbir
              <span className={styles.adminRoleBadge} style={{ fontWeight: 500, fontSize: '0.72rem' }}>
                {profilAdmin?.peranan.replace(/_/g, ' ')}
              </span>
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 400 }}>
              Log masuk sebagai: <strong>{profilAdmin?.nama}</strong> ({profilAdmin?.email})
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => window.print()} 
              style={{ 
                backgroundColor: '#1e293b', 
                color: '#38bdf8', 
                border: '1px solid #334155', 
                padding: '0.45rem 0.85rem', 
                borderRadius: '0.45rem', 
                fontWeight: 500, 
                fontSize: '0.82rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem' 
              }}
            >
              <Printer size={15} /> Cetak Laporan
            </button>
            <button 
              onClick={tanganiLogKeluar} 
              style={{ 
                backgroundColor: '#7f1d1d', 
                color: '#fca5a5', 
                border: '1px solid #991b1b', 
                padding: '0.45rem 0.85rem', 
                borderRadius: '0.45rem', 
                fontWeight: 500, 
                fontSize: '0.82rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem' 
              }}
            >
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </header>

        {/* Navigasi Tab */}
        <div className={styles.tabBar} style={{ marginBottom: '1.25rem' }}>
          {isKewangan && (
            <>
              <button onClick={() => setTabAktif('kewangan')} className={`${styles.tabBtn} ${tabAktif === 'kewangan' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
                <DollarSign size={16} /> Aliran Tunai &amp; Penyata
              </button>
              <button onClick={() => setTabAktif('inventori')} className={`${styles.tabBtn} ${tabAktif === 'inventori' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
                <Package size={16} /> Inventori &amp; Stok
              </button>
            </>
          )}

          {isPesakit && (
            <button onClick={() => setTabAktif('pesakit')} className={`${styles.tabBtn} ${tabAktif === 'pesakit' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
              <Users size={16} /> Direktori &amp; Sejarah Pesakit
            </button>
          )}

          {isSuper && (
            <>
              <button onClick={() => setTabAktif('perawat')} className={`${styles.tabBtn} ${tabAktif === 'perawat' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
                <Stethoscope size={16} /> Portfolio Perawat
              </button>
              <button onClick={() => setTabAktif('bilik')} className={`${styles.tabBtn} ${tabAktif === 'bilik' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
                <DoorOpen size={16} /> Kawalan Bilik Rawatan
              </button>
              <button onClick={() => setTabAktif('reaksi')} className={`${styles.tabBtn} ${tabAktif === 'reaksi' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
                <Sparkles size={16} /> Reaksi Ruqyah
              </button>
              <button onClick={() => setTabAktif('video')} className={`${styles.tabBtn} ${tabAktif === 'video' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
                <Film size={16} /> Siaran Video TV
              </button>
              <button onClick={() => setTabAktif('ticker')} className={`${styles.tabBtn} ${tabAktif === 'ticker' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
                <Radio size={16} /> Siaran Ticker TV
              </button>
              <button onClick={() => setTabAktif('admin')} className={`${styles.tabBtn} ${tabAktif === 'admin' ? styles.tabBtnActive : ''}`} style={{ fontWeight: 500 }}>
                <UserCheck size={16} /> Lantikan Pentadbir
              </button>
            </>
          )}
        </div>

        {/* ===================== TAB 1: ALIRAN TUNAI & PENYATA ===================== */}
        {tabAktif === 'kewangan' && isKewangan && (
          <div style={{ width: '100%' }}>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>
              💡 <em>Klik pada mana-mana kad tempoh kutipan di bawah untuk melihat perincian dan transaksi spesifik:</em>
            </p>

            {/* 4 KAD INTERAKTIF */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              {/* KAD 1: HARI INI */}
              <div 
                onClick={() => setTempohKewanganPilihan('hari')}
                style={{ 
                  backgroundColor: '#1e293b', 
                  border: tempohKewanganPilihan === 'hari' ? '1.5px solid #10b981' : '1px solid #334155', 
                  borderRadius: '0.75rem', 
                  padding: '1rem 1.15rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: tempohKewanganPilihan === 'hari' ? '0 4px 15px rgba(16, 185, 129, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    <TrendingUp size={14} /> Kutipan Hari Ini
                  </div>
                  {tempohKewanganPilihan === 'hari' && (
                    <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 500, backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                      Dipilih
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 600, color: '#10b981', marginTop: '0.4rem', letterSpacing: '-0.01em' }}>
                  RM {ringkasanKutipan.hariIni.toFixed(2)}
                </div>
              </div>

              {/* KAD 2: MINGGU INI */}
              <div 
                onClick={() => setTempohKewanganPilihan('minggu')}
                style={{ 
                  backgroundColor: '#1e293b', 
                  border: tempohKewanganPilihan === 'minggu' ? '1.5px solid #06b6d4' : '1px solid #334155', 
                  borderRadius: '0.75rem', 
                  padding: '1rem 1.15rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: tempohKewanganPilihan === 'minggu' ? '0 4px 15px rgba(6, 182, 212, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#22d3ee', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    <Calendar size={14} /> Kutipan Minggu Ini
                  </div>
                  {tempohKewanganPilihan === 'minggu' && (
                    <span style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 500, backgroundColor: 'rgba(6, 182, 212, 0.15)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                      Dipilih
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 600, color: '#06b6d4', marginTop: '0.4rem', letterSpacing: '-0.01em' }}>
                  RM {ringkasanKutipan.mingguIni.toFixed(2)}
                </div>
              </div>

              {/* KAD 3: BULAN INI */}
              <div 
                onClick={() => setTempohKewanganPilihan('bulan')}
                style={{ 
                  backgroundColor: '#1e293b', 
                  border: tempohKewanganPilihan === 'bulan' ? '1.5px solid #38bdf8' : '1px solid #334155', 
                  borderRadius: '0.75rem', 
                  padding: '1rem 1.15rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: tempohKewanganPilihan === 'bulan' ? '0 4px 15px rgba(56, 189, 248, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    <Calendar size={14} /> Kutipan Bulan Ini
                  </div>
                  {tempohKewanganPilihan === 'bulan' && (
                    <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 500, backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                      Dipilih
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.4rem', letterSpacing: '-0.01em' }}>
                  RM {ringkasanKutipan.bulanIni.toFixed(2)}
                </div>
              </div>

              {/* KAD 4: KUTIPAN KESELURUHAN (SEMUA BULAN) */}
              <div 
                onClick={() => setTempohKewanganPilihan('total')}
                style={{ 
                  backgroundColor: '#1e293b', 
                  border: tempohKewanganPilihan === 'total' ? '1.5px solid #a855f7' : '1px solid #334155', 
                  borderRadius: '0.75rem', 
                  padding: '1rem 1.15rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: tempohKewanganPilihan === 'total' ? '0 4px 15px rgba(168, 85, 247, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    <DollarSign size={14} /> Kutipan Keseluruhan (Semua Bulan)
                  </div>
                  {tempohKewanganPilihan === 'total' && (
                    <span style={{ fontSize: '0.65rem', color: '#c084fc', fontWeight: 500, backgroundColor: 'rgba(168, 85, 247, 0.15)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', flexShrink: 0 }}>
                      Dipilih
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 600, color: '#c084fc', marginTop: '0.4rem', letterSpacing: '-0.01em' }}>
                  RM {ringkasanKutipan.totalKutipan.toFixed(2)}
                </div>
              </div>
            </div>

            {/* 3 KOTAK PECAHAN */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '0.9rem 1.1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                  Kutipan Tunai ({labelTempoh}):
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f1f5f9', marginTop: '0.2rem' }}>
                  RM {pecahanKutipanAktif.tunai.toFixed(2)}
                </div>
              </div>

              <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '0.9rem 1.1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                  Kutipan DuitNow QR ({labelTempoh}):
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.2rem' }}>
                  RM {pecahanKutipanAktif.qr.toFixed(2)}
                </div>
              </div>

              <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '0.9rem 1.1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                  Bilangan Resit ({labelTempoh}):
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f59e0b', marginTop: '0.2rem' }}>
                  {pecahanKutipanAktif.bilanganResit} Resit
                </div>
              </div>
            </div>

            {/* JADUAL TRANSAKSI */}
            <div className={styles.cardPanel} style={{ width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div>
                  <h2 className={styles.panelTitle} style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                    Rekod Transaksi Masuk — {labelTempoh}
                  </h2>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                    Menunjukkan {transaksiDitapis.length} transaksi bagi pilihan aktif
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={muatDataKewangan}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#34d399',
                      border: '1px solid #334155',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.4rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <RefreshCw size={13} /> Segar Semula
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.4rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Printer size={13} /> Cetak Penyata
                  </button>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table} style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center', fontWeight: 500, fontSize: '0.78rem' }}>No.</th>
                      <th style={{ fontWeight: 500, fontSize: '0.78rem' }}>No. Resit</th>
                      <th style={{ fontWeight: 500, fontSize: '0.78rem' }}>Hari / Tarikh</th>
                      <th style={{ fontWeight: 500, fontSize: '0.78rem' }}>Masa</th>
                      <th style={{ fontWeight: 500, fontSize: '0.78rem' }}>Nama Pesakit</th>
                      <th style={{ fontWeight: 500, fontSize: '0.78rem' }}>Kaedah Bayaran</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, fontSize: '0.78rem' }}>Jumlah (RM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaksiDitapis.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                          Tiada rekod transaksi bagi tempoh {labelTempoh}.
                        </td>
                      </tr>
                    ) : (
                      transaksiDitapis.map((trx, idx) => (
                        <tr key={trx.id}>
                          <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>{idx + 1}</td>
                          <td style={{ color: '#38bdf8', fontWeight: 500, fontSize: '0.8rem' }}>{trx.no_resit}</td>
                          <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                            {trx.created_at
                              ? new Date(trx.created_at).toLocaleDateString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })
                              : (trx.tarikh || '-')}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {trx.created_at
                              ? new Date(trx.created_at).toLocaleTimeString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </td>
                          <td style={{ fontWeight: 500, color: '#f1f5f9', fontSize: '0.8rem' }}>
                            {trx.pesakit?.nama || 'Pesakit Am'}
                          </td>
                          <td>
                            <span 
                              className={`${styles.badgeMethod} ${trx.kaedah_bayaran === 'tunai' ? styles.methodCash : styles.methodQR}`}
                              style={{ fontWeight: 500, fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                            >
                              {trx.kaedah_bayaran === 'tunai' ? 'Tunai' : 'DuitNow QR'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: '#34d399', fontWeight: 600, fontSize: '0.82rem' }}>
                            +RM {Number(trx.jumlah).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: INVENTORI & STOK ===================== */}
        {tabAktif === 'inventori' && isKewangan && (
          <div style={{ width: '100%' }}>
            <div className={styles.subTabBar}>
              <button onClick={() => setSubTabInventori('baki')} className={`${styles.subTabBtn} ${subTabInventori === 'baki' ? styles.subTabBtnActive : ''}`} style={{ fontWeight: 500 }}>Katalog Item</button>
              <button onClick={() => setSubTabInventori('masuk')} className={`${styles.subTabBtn} ${subTabInventori === 'masuk' ? styles.subTabMasukActive : ''}`} style={{ fontWeight: 500 }}>Stok Masuk</button>
              <button onClick={() => setSubTabInventori('keluar')} className={`${styles.subTabBtn} ${subTabInventori === 'keluar' ? styles.subTabKeluarActive : ''}`} style={{ fontWeight: 500 }}>Stok Keluar</button>
            </div>

            {subTabInventori === 'baki' && (
              <div className={styles.cardPanel}>
                <div className={styles.tableHeaderActionRow}>
                  <div><h2 className={styles.panelTitle} style={{ margin: 0, fontWeight: 600 }}>Katalog Inventori &amp; Stok Semasa</h2></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedBahan.length > 0 && (
                      <button onClick={padamBahanPukal} disabled={memproses} className={styles.btnBulkDelete}>
                        <Trash2 size={13} /> Padam Terpilih ({selectedBahan.length})
                      </button>
                    )}
                    <button onClick={() => setBukaModalTambahBahan(true)} className={styles.btnAction} style={{ fontWeight: 500 }}>
                      <PlusCircle size={14} /> Daftar Item
                    </button>
                  </div>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table} style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input type="checkbox" className={styles.tableCheckbox} checked={senaraiBahan.length > 0 && selectedBahan.length === senaraiBahan.length} onChange={toggleSelectAllBahan} />
                        </th>
                        <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                        <th style={{ fontWeight: 500 }}>Nama Item</th>
                        <th style={{ fontWeight: 500 }}>Kategori</th>
                        <th style={{ fontWeight: 500 }}>Harga</th>
                        <th style={{ fontWeight: 500 }}>Baki</th>
                        <th style={{ fontWeight: 500 }}>Status</th>
                        <th style={{ textAlign: 'center', fontWeight: 500 }}>Tindakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {senaraiBahan.map((b, idx) => (
                        <tr key={b.id}>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" className={styles.tableCheckbox} checked={selectedBahan.includes(b.id)} onChange={() => toggleSelectBahan(b.id)} />
                          </td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 500, color: '#f1f5f9' }}>{b.nama_item}</td>
                          <td>{b.kategori}</td>
                          <td>RM {Number(b.harga).toFixed(2)}</td>
                          <td style={{ fontWeight: 500 }}>{b.stok_semasa} unit</td>
                          <td>{b.stok_semasa <= b.tahap_amaran ? <span className={styles.badgeLow}>Rendah</span> : <span className={styles.badgeOk}>Cukup</span>}</td>
                          <td>
                            <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                              <button type="button" onClick={() => { setItemDiedit(b); setFormNama(b.nama_item); setFormKategori(b.kategori); setFormHarga(String(b.harga)); setFormStokAwal(String(b.stok_semasa)); setFormTahapAmaran(String(b.tahap_amaran)); }} className={styles.btnEdit}>
                                <Edit size={12} /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {subTabInventori === 'masuk' && (
              <div>
                <div className={styles.cardPanel}>
                  <h2 className={styles.panelTitle} style={{ fontWeight: 600 }}>Kemasukan Stok Masuk</h2>
                  <form onSubmit={masukkanStok} className={styles.stockFormGrid}>
                    <select className={styles.selectField} value={bahanPilihanId} onChange={(e) => setBahanPilihanId(e.target.value)}>
                      {senaraiBahan.map(b => <option key={b.id} value={b.id}>{b.nama_item} (Baki: {b.stok_semasa})</option>)}
                    </select>
                    <input type="number" placeholder="Kuantiti" className={styles.inputField} value={kuantitiTambah} onChange={(e) => setKuantitiTambah(e.target.value)} />
                    <input type="text" placeholder="Catatan Pembekal" className={styles.inputField} value={catatanStok} onChange={(e) => setCatatanStok(e.target.value)} />
                    <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}><PlusCircle size={14} /> Tambah</button>
                  </form>
                </div>
              </div>
            )}

            {subTabInventori === 'keluar' && (
              <div className={styles.cardPanel}>
                <h2 className={styles.panelTitle} style={{ fontWeight: 600 }}>Rekod Stok Keluar (Jualan Kaunter)</h2>
                <div className={styles.tableWrapper}>
                  <table className={styles.table} style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                        <th style={{ fontWeight: 500 }}>Tarikh &amp; Masa</th>
                        <th style={{ fontWeight: 500 }}>Item</th>
                        <th style={{ fontWeight: 500 }}>Kuantiti Keluar</th>
                        <th style={{ fontWeight: 500 }}>Baki Tinggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {senaraiLog.filter(l => l.jenis_pergerakan === 'keluar').map((l, idx) => (
                        <tr key={l.id}>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td>{new Date(l.created_at).toLocaleString('ms-MY')}</td>
                          <td style={{ fontWeight: 500 }}>{l.bahan_penawar?.nama_item}</td>
                          <td style={{ color: '#f87171', fontWeight: 500 }}>-{l.kuantiti}</td>
                          <td>{l.baki_selepas} unit</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: DIREKTORI & SEJARAH PESAKIT ===================== */}
        {tabAktif === 'pesakit' && isPesakit && (
          <div className={styles.cardPanel} style={{ width: '100%' }}>
            <div className={styles.tableHeaderActionRow}>
              <div><h2 className={styles.panelTitle} style={{ margin: 0, fontWeight: 600 }}>Direktori Pesakit &amp; Rekod Rawatan</h2></div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedPesakit.length > 0 && (
                  <button onClick={padamPesakitPukal} disabled={memproses} className={styles.btnBulkDelete}>
                    <Trash2 size={13} /> Padam Terpilih ({selectedPesakit.length})
                  </button>
                )}
                <input type="text" placeholder="Cari nama, No. IC, atau No. Tel..." className={styles.searchBar} value={carianPesakit} onChange={(e) => setCarianPesakit(e.target.value)} />
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input type="checkbox" className={styles.tableCheckbox} checked={senaraiPesakitDitapis.length > 0 && selectedPesakit.length === senaraiPesakitDitapis.length} onChange={toggleSelectAllPesakit} />
                    </th>
                    <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                    <th style={{ fontWeight: 500 }}>Nama Pesakit</th>
                    <th style={{ fontWeight: 500 }}>No. Kad Pengenalan</th>
                    <th style={{ fontWeight: 500 }}>No. Telefon</th>
                    <th style={{ fontWeight: 500 }}>Alamat Kediaman</th>
                    <th style={{ fontWeight: 500 }}>Tarikh Daftar</th>
                    <th style={{ textAlign: 'center', fontWeight: 500 }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {senaraiPesakitDitapis.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" className={styles.tableCheckbox} checked={selectedPesakit.includes(p.id)} onChange={() => toggleSelectPesakit(p.id)} />
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{p.nama}</td>
                      <td>{p.no_ic}</td>
                      <td>{p.no_telefon}</td>
                      <td>{p.alamat || <span style={{ color: '#64748b' }}>Belum diisi</span>}</td>
                      <td>{new Date(p.created_at).toLocaleDateString('ms-MY')}</td>
                      <td>
                        <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                          <button onClick={() => setPesakitDiedit(p)} className={styles.btnEdit}><Edit size={12} /> Edit</button>
                          <button onClick={() => bukaGarisMasaPesakit(p)} className={styles.btnHistory}><History size={12} /> Sejarah</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: PORTFOLIO PERAWAT ===================== */}
        {tabAktif === 'perawat' && isSuper && (
          <div className={styles.cardPanel} style={{ width: '100%' }}>
            <div className={styles.tableHeaderActionRow}>
              <div><h2 className={styles.panelTitle} style={{ margin: 0, fontWeight: 600 }}>Pengurusan Portfolio &amp; Tauliah Perawat</h2></div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedPerawat.length > 0 && (
                  <button onClick={padamPerawatPukal} disabled={memproses} className={styles.btnBulkDelete}>
                    <Trash2 size={13} /> Padam Terpilih ({selectedPerawat.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setPerawatDiedit({
                      id: '',
                      nama: '',
                      no_bilik: '-',
                      no_ic: '',
                      no_telefon: '',
                      kelayakan: '',
                      bidang_khusus: '',
                      status_aktif: true
                    });
                    setBukaModalPerawat(true);
                  }}
                  className={styles.btnAction}
                  style={{ fontWeight: 500 }}
                >
                  <PlusCircle size={14} /> Lantik Perawat Baharu
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input type="checkbox" className={styles.tableCheckbox} checked={senaraiPerawat.length > 0 && selectedPerawat.length === senaraiPerawat.length} onChange={toggleSelectAllPerawat} />
                    </th>
                    <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                    <th style={{ fontWeight: 500 }}>Nama Perawat</th>
                    <th style={{ fontWeight: 500 }}>No. Telefon</th>
                    <th style={{ fontWeight: 500 }}>Kelayakan / Tauliah</th>
                    <th style={{ fontWeight: 500 }}>Bidang Tumpuan Ruqyah</th>
                    <th style={{ fontWeight: 500 }}>Status</th>
                    <th style={{ textAlign: 'center', fontWeight: 500 }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {senaraiPerawat.map((u, idx) => (
                    <tr key={u.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" className={styles.tableCheckbox} checked={selectedPerawat.includes(u.id)} onChange={() => toggleSelectPerawat(u.id)} />
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{u.nama}</td>
                      <td>{u.no_telefon || '-'}</td>
                      <td>{u.kelayakan || 'Perawat Bertauliah Darul Syifa'}</td>
                      <td>{u.bidang_khusus || 'Ruqyah Syar’iyyah Am'}</td>
                      <td>{u.status_aktif ? <span className={styles.badgeOk}>Aktif</span> : <span className={styles.badgeLow}>Bercuti</span>}</td>
                      <td>
                        <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                          <button onClick={() => { setPerawatDiedit(u); setBukaModalPerawat(true); }} className={styles.btnEdit}>
                            <Edit size={12} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 5: KAWALAN BILIK RAWATAN ===================== */}
        {tabAktif === 'bilik' && isSuper && (
          <div className={styles.cardPanel} style={{ width: '100%' }}>
            <div className={styles.tableHeaderActionRow}>
              <div>
                <h2 className={styles.panelTitle} style={{ margin: 0, fontWeight: 600 }}>Kawalan Bilik Rawatan Fizikal</h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Pantau perawat yang sedang <em>check-in</em> di setiap bilik dan lepaskan bilik jika berlaku kekeliruan syif
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedBilik.length > 0 && (
                  <button
                    type="button"
                    onClick={padamBilikPukal}
                    disabled={memproses}
                    className={styles.btnBulkDelete}
                  >
                    <Trash2 size={13} /> Padam Terpilih ({selectedBilik.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setBilikDiedit(null);
                    setFormNamaBilik('');
                    setBukaModalBilik(true);
                  }}
                  className={styles.btnAction}
                  style={{ fontWeight: 500 }}
                >
                  <PlusCircle size={14} /> Tambah Bilik Rawatan
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className={styles.tableCheckbox}
                        checked={senaraiBilik.length > 0 && selectedBilik.length === senaraiBilik.length}
                        onChange={toggleSelectAllBilik}
                      />
                    </th>
                    <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                    <th style={{ fontWeight: 500 }}>Nama Bilik</th>
                    <th style={{ fontWeight: 500 }}>Tabib Bertugas Semasa</th>
                    <th style={{ fontWeight: 500 }}>Sesi</th>
                    <th style={{ fontWeight: 500 }}>Status Penggunaan</th>
                    <th style={{ fontWeight: 500 }}>Operasi Bilik</th>
                    <th style={{ textAlign: 'center', fontWeight: 500 }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {senaraiBilik.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Tiada bilik rawatan didaftarkan.
                      </td>
                    </tr>
                  ) : (
                    senaraiBilik.map((b, idx) => (
                      <tr
                        key={b.id}
                        style={{ backgroundColor: selectedBilik.includes(b.id) ? 'rgba(2, 132, 199, 0.1)' : undefined }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className={styles.tableCheckbox}
                            checked={selectedBilik.includes(b.id)}
                            onChange={() => toggleSelectBilik(b.id)}
                          />
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{b.nama_bilik}</td>
                        <td>
                          {b.perawat?.nama ? (
                            <span style={{ color: '#38bdf8', fontWeight: 500 }}>{b.perawat.nama}</span>
                          ) : (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Kosong (Tiada Perawat)</span>
                          )}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{b.sesi || '-'}</td>
                        <td>
                          {b.perawat_semasa_id ? (
                            <span className={styles.badgeLow}>Digunakan</span>
                          ) : (
                            <span className={styles.badgeOk}>Tersedia</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => toggleStatusAktifBilik(b)}
                            style={{
                              backgroundColor: b.status_aktif ? '#065f46' : '#7f1d1d',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '0.35rem',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            {b.status_aktif ? 'Buka (Aktif)' : 'Tutup Bilik'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setBilikDiedit(b);
                                setFormNamaBilik(b.nama_bilik);
                                setBukaModalBilik(true);
                              }}
                              className={styles.btnEdit}
                              style={{ padding: '0.35rem 0.65rem' }}
                            >
                              <Edit size={12} /> Edit
                            </button>
                            {b.perawat_semasa_id && (
                              <button
                                type="button"
                                onClick={() => kosongkanBilik(b.id)}
                                className={styles.btnBulkDelete}
                                style={{ padding: '0.35rem 0.65rem' }}
                                title="Lepaskan perawat daripada bilik ini"
                              >
                                Kosongkan Bilik
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={memproses}
                              onClick={() => tanganiPadamSatuBilik(b.id)}
                              className={styles.btnBulkDelete}
                              style={{ padding: '0.35rem 0.65rem' }}
                            >
                              <Trash2 size={12} /> Padam
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 6: PENGURUSAN REAKSI RUQYAH ===================== */}
        {tabAktif === 'reaksi' && isSuper && (
          <div className={styles.cardPanel} style={{ width: '100%' }}>
            <div className={styles.tableHeaderActionRow}>
              <div>
                <h2 className={styles.panelTitle} style={{ margin: 0, fontWeight: 600 }}>Pengurusan Senarai Reaksi Ruqyah</h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Tambah, kemaskini atau nyahaktifkan tag simptom reaksi ruqyah yang terpapar di konsol perawat
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedReaksi.length > 0 && (
                  <button
                    type="button"
                    onClick={padamReaksiPukal}
                    disabled={memproses}
                    className={styles.btnBulkDelete}
                  >
                    <Trash2 size={13} /> Padam Terpilih ({selectedReaksi.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setReaksiDiedit(null);
                    setFormNamaReaksi('');
                    setFormKeteranganReaksi('');
                    setBukaModalReaksi(true);
                  }}
                  className={styles.btnAction}
                  style={{ fontWeight: 500 }}
                >
                  <PlusCircle size={14} /> Tambah Reaksi Baharu
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className={styles.tableCheckbox}
                        checked={senaraiReaksi.length > 0 && selectedReaksi.length === senaraiReaksi.length}
                        onChange={toggleSelectAllReaksi}
                      />
                    </th>
                    <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                    <th style={{ fontWeight: 500 }}>Nama Reaksi / Simptom</th>
                    <th style={{ fontWeight: 500 }}>Penerangan Klinikal (Pilihan)</th>
                    <th style={{ textAlign: 'center', fontWeight: 500 }}>Status</th>
                    <th style={{ textAlign: 'center', fontWeight: 500 }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {senaraiReaksi.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Tiada reaksi ruqyah didaftarkan.
                      </td>
                    </tr>
                  ) : (
                    senaraiReaksi.map((r, idx) => (
                      <tr key={r.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className={styles.tableCheckbox}
                            checked={selectedReaksi.includes(r.id)}
                            onChange={() => toggleSelectReaksi(r.id)}
                          />
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{r.nama_reaksi}</td>
                        <td style={{ color: '#94a3b8' }}>{r.keterangan || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleStatusReaksi(r)}
                            style={{
                              backgroundColor: r.status_aktif ? '#065f46' : '#7f1d1d',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '0.35rem',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            {r.status_aktif ? 'Aktif' : 'Nyahaktif'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setReaksiDiedit(r);
                                setFormNamaReaksi(r.nama_reaksi);
                                setFormKeteranganReaksi(r.keterangan || '');
                                setBukaModalReaksi(true);
                              }}
                              className={styles.btnEdit}
                              style={{ padding: '0.35rem 0.65rem' }}
                            >
                              <Edit size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              disabled={memproses}
                              onClick={() => tanganiPadamSatuReaksi(r.id)}
                              className={styles.btnBulkDelete}
                              style={{ padding: '0.35rem 0.65rem' }}
                            >
                              <Trash2 size={12} /> Padam
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 7: SIARAN VIDEO TV ===================== */}
        {tabAktif === 'video' && isSuper && (
          <div className={styles.cardPanel} style={{ width: '100%' }}>
            <div className={styles.tableHeaderActionRow}>
              <div>
                <h2 className={styles.panelTitle} style={{ margin: 0, fontWeight: 600 }}>Pengurusan Siaran Video Skrin TV</h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Tetapkan pautan YouTube atau fail MP4 untuk dimainkan di kotak dewan menunggu
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedVideo.length > 0 && (
                  <button type="button" onClick={padamVideoPukal} disabled={memproses} className={styles.btnBulkDelete}>
                    <Trash2 size={13} /> Padam Terpilih ({selectedVideo.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setVideoDiedit(null);
                    setFormTajukVideo('');
                    setFormUrlVideo('');
                    setFormJenisVideo('youtube');
                    setFormLoopVideo(false);
                    setFormKelantangan(20);
                    setBukaModalVideo(true);
                  }}
                  className={styles.btnAction}
                  style={{ fontWeight: 500 }}
                >
                  <PlusCircle size={14} /> Tambah Video TV
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className={styles.tableCheckbox}
                        checked={senaraiVideo.length > 0 && selectedVideo.length === senaraiVideo.length}
                        onChange={toggleSelectAllVideo}
                      />
                    </th>
                    <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                    <th style={{ fontWeight: 500 }}>Tajuk Video</th>
                    <th style={{ fontWeight: 500 }}>Jenis Media</th>
                    <th style={{ fontWeight: 500 }}>Pautan / URL</th>
                    <th style={{ fontWeight: 500 }}>Mod Mainan</th>
                    <th style={{ fontWeight: 500 }}>Kelantangan Audio</th>
                    <th style={{ textAlign: 'center', fontWeight: 500 }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {senaraiVideo.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Belum ada video siaran TV didaftarkan.
                      </td>
                    </tr>
                  ) : (
                    senaraiVideo.map((v, idx) => (
                      <tr key={v.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className={styles.tableCheckbox}
                            checked={selectedVideo.includes(v.id)}
                            onChange={() => toggleSelectVideo(v.id)}
                          />
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{v.tajuk}</td>
                        <td>
                          <span className={styles.badgeMethod} style={{ backgroundColor: v.jenis === 'youtube' ? '#dc2626' : '#0284c7', color: '#fff' }}>
                            {v.jenis.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#38bdf8', fontSize: '0.8rem' }}>
                          {v.url_video}
                        </td>
                        <td>
                          {v.loop_tunggal ? (
                            <span style={{ color: '#fbbf24', fontWeight: 500 }}>🔄 Berulang (Loop)</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>🔀 Main Rawak</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: v.kelantangan_audio === 0 ? '#64748b' : v.kelantangan_audio <= 30 ? '#34d399' : '#f59e0b' }}>
                            {v.kelantangan_audio === 0 ? 'Bisu (0%)' : `${v.kelantangan_audio}%`}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setVideoDiedit(v);
                                setFormTajukVideo(v.tajuk);
                                setFormUrlVideo(v.url_video);
                                setFormJenisVideo(v.jenis);
                                setFormLoopVideo(v.loop_tunggal);
                                setFormKelantangan(v.kelantangan_audio);
                                setBukaModalVideo(true);
                              }}
                              className={styles.btnEdit}
                              style={{ padding: '0.35rem 0.65rem' }}
                            >
                              <Edit size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              disabled={memproses}
                              onClick={() => tanganiPadamSatuVideo(v.id)}
                              className={styles.btnBulkDelete}
                              style={{ padding: '0.35rem 0.65rem' }}
                            >
                              <Trash2 size={12} /> Padam
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 8: SIARAN TICKER TV ===================== */}
        {tabAktif === 'ticker' && isSuper && (
          <div className={styles.cardPanel} style={{ width: '100%' }}>
            <div className={styles.tableHeaderActionRow}>
              <div>
                <h2 className={styles.panelTitle} style={{ margin: 0, fontWeight: 600 }}>Pengurusan Siaran Ticker (Teks Bergerak TV)</h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Urus ayat al-Quran, hadis, kata-kata hikmah, dan makluman penting di bahagian bawah skrin TV
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTickerDiedit(null);
                  setFormTeksArab('');
                  setFormTeksMaksud('');
                  setFormRujukan('');
                  setFormKategoriTicker('makluman');
                  setFormTurutanTicker('1');
                  setBukaModalTicker(true);
                }}
                className={styles.btnAction}
                style={{ fontWeight: 500 }}
              >
                <PlusCircle size={14} /> Tambah Mesej Ticker
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                    <th style={{ fontWeight: 500 }}>Kategori</th>
                    <th style={{ fontWeight: 500 }}>Teks Maksud / Pengumuman</th>
                    <th style={{ fontWeight: 500 }}>Teks Arab (Pilihan)</th>
                    <th style={{ fontWeight: 500 }}>Rujukan</th>
                    <th style={{ textAlign: 'center', fontWeight: 500 }}>Status</th>
                    <th style={{ textAlign: 'center', fontWeight: 500 }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {senaraiTicker.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Tiada makluman ticker didaftarkan.
                      </td>
                    </tr>
                  ) : (
                    senaraiTicker.map((t, idx) => (
                      <tr key={t.id}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td>
                          <span className={styles.badgeMethod} style={{
                            backgroundColor: t.kategori === 'ayat_syifa' ? '#065f46' : t.kategori === 'promosi' ? '#854d0e' : '#0284c7',
                            color: '#fff',
                            textTransform: 'uppercase',
                            fontWeight: 500
                          }}>
                            {t.kategori ? t.kategori.replace('_', ' ') : 'MAKLUMAN'}
                          </span>
                        </td>
                        <td style={{ color: '#f1f5f9', fontWeight: 400 }}>{t.teks_maksud}</td>
                        <td style={{ color: '#38bdf8', direction: 'rtl', fontFamily: 'serif' }}>{t.teks_arab || '-'}</td>
                        <td>{t.rujukan || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleStatusTicker(t)}
                            style={{
                              backgroundColor: t.status_aktif ? '#065f46' : '#7f1d1d',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '0.35rem',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            {t.status_aktif ? 'Aktif' : 'Senyap'}
                          </button>
                        </td>
                        <td>
                          <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setTickerDiedit(t);
                                setFormTeksArab(t.teks_arab || '');
                                setFormTeksMaksud(t.teks_maksud);
                                setFormRujukan(t.rujukan || '');
                                setFormKategoriTicker(t.kategori || 'makluman');
                                setFormTurutanTicker(String(t.turutan || 1));
                                setBukaModalTicker(true);
                              }}
                              className={styles.btnEdit}
                              style={{ padding: '0.35rem 0.65rem' }}
                            >
                              <Edit size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => padamTicker(t.id)}
                              className={styles.btnBulkDelete}
                              style={{ padding: '0.35rem 0.65rem' }}
                            >
                              <Trash2 size={12} /> Padam
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 9: LANTIKAN PENTADBIR ===================== */}
        {tabAktif === 'admin' && isSuper && (
          <div className={styles.cardPanel} style={{ width: '100%' }}>
            <div className={styles.tableHeaderActionRow}>
              <div><h2 className={styles.panelTitle} style={{ margin: 0, fontWeight: 600 }}>Pengurusan &amp; Lantikan Pentadbir Sistem</h2></div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedAdmin.length > 0 && (
                  <button onClick={padamAdminPukal} disabled={memproses} className={styles.btnBulkDelete}>
                    <Trash2 size={13} /> Padam Terpilih ({selectedAdmin.length})
                  </button>
                )}
                <button onClick={() => setBukaModalAdmin(true)} className={styles.btnAction} style={{ fontWeight: 500 }}>
                  <PlusCircle size={14} /> Lantik Pentadbir Baharu
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input type="checkbox" className={styles.tableCheckbox} checked={adminBolehDipadam.length > 0 && selectedAdmin.length === adminBolehDipadam.length} onChange={toggleSelectAllAdmin} />
                    </th>
                    <th style={{ width: '45px', textAlign: 'center', fontWeight: 500 }}>No.</th>
                    <th style={{ fontWeight: 500 }}>Nama Pentadbir</th>
                    <th style={{ fontWeight: 500 }}>E-mel</th>
                    <th style={{ fontWeight: 500 }}>Peranan Capaian</th>
                    <th style={{ fontWeight: 500 }}>Tarikh Lantikan</th>
                  </tr>
                </thead>
                <tbody>
                  {senaraiSemuaAdmin.map((adm, idx) => {
                    const sayaSendiri = adm.id === profilAdmin?.id;
                    return (
                      <tr key={adm.id}>
                        <td style={{ textAlign: 'center' }}>
                          {!sayaSendiri ? (
                            <input type="checkbox" className={styles.tableCheckbox} checked={selectedAdmin.includes(adm.id)} onChange={() => toggleSelectAdmin(adm.id)} />
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Saya</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{adm.nama}</td>
                        <td>{adm.email}</td>
                        <td>
                          <span className={styles.adminRoleBadge} style={{ fontWeight: 500 }}>
                            {adm.peranan.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{new Date(adm.created_at || Date.now()).toLocaleDateString('ms-MY')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL-MODAL SISTEM
         ======================================================== */}

      {/* MODAL 1: EDIT PESAKIT */}
      {pesakitDiedit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Kemaskini Profil &amp; Alamat Pesakit</h3>
              <button onClick={() => setPesakitDiedit(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpanKemaskiniPesakit}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Nama Penuh:</label>
                  <input type="text" required className={styles.inputField} value={pesakitDiedit.nama} onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, nama: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>No. Kad Pengenalan:</label>
                  <input type="text" required className={styles.inputField} value={pesakitDiedit.no_ic} onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, no_ic: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>No. Telefon:</label>
                  <input type="text" required className={styles.inputField} value={pesakitDiedit.no_telefon} onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, no_telefon: e.target.value })} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Alamat Kediaman Pesakit:</label>
                  <textarea rows={3} className={styles.inputField} value={pesakitDiedit.alamat || ''} onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, alamat: e.target.value })} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setPesakitDiedit(null)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}><Edit size={14} /> Simpan Maklumat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SEJARAH RAWATAN PESAKIT */}
      {pesakitGarisMasa && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div><h3 className={styles.modalTitle}>Sejarah Rawatan: {pesakitGarisMasa.nama}</h3></div>
              <button onClick={() => setPesakitGarisMasa(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div>
              {sejarahSesi.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                  Belum ada rekod sejarah sesi rawatan lampau bagi pesakit ini.
                </p>
              ) : (
                sejarahSesi.map((s) => (
                  <div key={s.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                      <span>{new Date(s.created_at).toLocaleDateString('ms-MY')}</span>
                      <strong style={{ color: '#38bdf8', fontWeight: 500 }}>{s.perawat?.nama}</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#f1f5f9' }}>
                      <strong>Dapatan / Reaksi:</strong> {Array.isArray(s.reaksi_rawatan) ? s.reaksi_rawatan.join(', ') : s.dapatan_gangguan}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setPesakitGarisMasa(null)} className={styles.btnCancel}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PORTFOLIO PERAWAT */}
      {bukaModalPerawat && perawatDiedit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{perawatDiedit.id ? 'Kemaskini Perawat' : 'Daftar Perawat Baharu'}</h3>
              <button onClick={() => setBukaModalPerawat(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpanPerawat}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Nama Penuh (Beserta Gelaran):</label>
                  <input type="text" required placeholder="cth: Ustaz Dr. Amri Mahmud" className={styles.inputField} value={perawatDiedit.nama} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, nama: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>No. Bilik Rawatan:</label>
                  <input type="text" disabled className={styles.inputField} value="Ditetapkan Semasa Check-In" style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#0f172a' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>No. Telefon:</label>
                  <input type="text" placeholder="012-3456789" className={styles.inputField} value={perawatDiedit.no_telefon || ''} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, no_telefon: e.target.value })} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Kelayakan / Sijil Tauliah:</label>
                  <input
                    type="text"
                    placeholder="cth: Sijil Rawatan Islam Darul Syifa (Kohort 2020)"
                    className={styles.inputField}
                    value={perawatDiedit.kelayakan || ''}
                    onChange={(e) => setPerawatDiedit({ ...perawatDiedit, kelayakan: e.target.value })}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Bidang Tumpuan / Kepakaran Ruqyah:</label>
                  <input
                    type="text"
                    placeholder="cth: Gangguan Sihir Rumah Tangga & Trauma Emosi"
                    className={styles.inputField}
                    value={perawatDiedit.bidang_khusus || ''}
                    onChange={(e) => setPerawatDiedit({ ...perawatDiedit, bidang_khusus: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setBukaModalPerawat(false)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}><PlusCircle size={14} /> Simpan Portfolio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH / EDIT BILIK RAWATAN */}
      {bukaModalBilik && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{bilikDiedit ? 'Kemaskini Bilik Rawatan' : 'Daftar Bilik Rawatan Baharu'}</h3>
              <button 
                onClick={() => { 
                  setBukaModalBilik(false); 
                  setBilikDiedit(null); 
                  setFormNamaBilik(''); 
                }} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={simpanBilik}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Nama Bilik Fizikal:</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Bilik 5"
                    className={styles.inputField}
                    value={formNamaBilik}
                    onChange={(e) => setFormNamaBilik(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => { 
                    setBukaModalBilik(false); 
                    setBilikDiedit(null); 
                    setFormNamaBilik(''); 
                  }} 
                  className={styles.btnCancel}
                >
                  Batal
                </button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}>
                  <PlusCircle size={14} /> {bilikDiedit ? 'Simpan Kemaskini' : 'Simpan Bilik'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: TAMBAH / EDIT REAKSI RUQYAH */}
      {bukaModalReaksi && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '460px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{reaksiDiedit ? 'Kemaskini Reaksi Ruqyah' : 'Tambah Reaksi Ruqyah Baharu'}</h3>
              <button 
                onClick={() => { 
                  setBukaModalReaksi(false); 
                  setReaksiDiedit(null); 
                  setFormNamaReaksi(''); 
                  setFormKeteranganReaksi(''); 
                }} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={simpanReaksi}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Nama Reaksi / Simptom:</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Menggigil Sejuk Kaki Tangan"
                    className={styles.inputField}
                    value={formNamaReaksi}
                    onChange={(e) => setFormNamaReaksi(e.target.value)}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Penerangan Klinikal Ringkas (Pilihan):</label>
                  <textarea
                    rows={2}
                    placeholder="cth: Pesakit mengalami rasa kebas atau kesejukan melampau pada hujung jari semasa ruqyah dibaca."
                    className={styles.inputField}
                    value={formKeteranganReaksi}
                    onChange={(e) => setFormKeteranganReaksi(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => { 
                    setBukaModalReaksi(false); 
                    setReaksiDiedit(null); 
                    setFormNamaReaksi(''); 
                    setFormKeteranganReaksi(''); 
                  }} 
                  className={styles.btnCancel}
                >
                  Batal
                </button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}>
                  <PlusCircle size={14} /> {reaksiDiedit ? 'Simpan Kemaskini' : 'Tambah Reaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: TAMBAH / EDIT VIDEO TV */}
      {bukaModalVideo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '520px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{videoDiedit ? 'Kemaskini Video Siaran TV' : 'Tambah Video Siaran TV'}</h3>
              <button onClick={() => { setBukaModalVideo(false); setVideoDiedit(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={simpanVideo}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Tajuk / Penerangan Video:</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Tazkirah Ketenangan Jiwa & Ruqyah Asas"
                    className={styles.inputField}
                    value={formTajukVideo}
                    onChange={(e) => setFormTajukVideo(e.target.value)}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Pautan YouTube atau URL Fail MP4:</label>
                  <input
                    type="text"
                    required
                    placeholder="https://www.youtube.com/watch?v=... atau https://domain.com/video.mp4"
                    className={styles.inputField}
                    value={formUrlVideo}
                    onChange={(e) => {
                      const url = e.target.value;
                      setFormUrlVideo(url);
                      if (url.includes('.mp4')) setFormJenisVideo('mp4');
                      else setFormJenisVideo('youtube');
                    }}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Jenis Media:</label>
                  <select
                    className={styles.selectField}
                    value={formJenisVideo}
                    onChange={(e: any) => setFormJenisVideo(e.target.value)}
                  >
                    <option value="youtube">YouTube Video</option>
                    <option value="mp4">Fail Video MP4 Terus</option>
                  </select>
                </div>

                <div className={styles.formGroupFull} style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '0.65rem', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 500, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Volume2 size={15} /> Had Kelantangan Audio: {formKelantangan}%
                    </label>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formKelantangan}
                    onChange={(e) => setFormKelantangan(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#0284c7' }}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.5rem 0' }}>
                    <input
                      type="checkbox"
                      checked={formLoopVideo}
                      onChange={(e) => setFormLoopVideo(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#f1f5f9' }}>
                      Ulang video ini sahaja secara berterusan (Loop)?
                    </span>
                  </label>
                </div>
              </div>

              <div className={styles.modalActions} style={{ marginTop: '1.25rem' }}>
                <button type="button" onClick={() => { setBukaModalVideo(false); setVideoDiedit(null); }} className={styles.btnCancel}>
                  Batal
                </button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}>
                  <PlusCircle size={14} /> {videoDiedit ? 'Simpan Kemaskini' : 'Tambah Video ke TV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: TAMBAH / EDIT TICKER TV */}
      {bukaModalTicker && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '520px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{tickerDiedit ? 'Kemaskini Mesej Ticker' : 'Tambah Mesej Ticker Baharu'}</h3>
              <button onClick={() => { setBukaModalTicker(false); setTickerDiedit(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={simpanTicker}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Teks Maksud / Pengumuman:</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="cth: Dan apabila aku sakit, Dialah yang menyembuhkan aku."
                    className={styles.inputField}
                    value={formTeksMaksud}
                    onChange={(e) => setFormTeksMaksud(e.target.value)}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Teks Arab (Pilihan):</label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ"
                    className={styles.inputField}
                    value={formTeksArab}
                    onChange={(e) => setFormTeksArab(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Rujukan (cth: Surah Asy-Syu&apos;ara&apos; : 80):</label>
                  <input
                    type="text"
                    placeholder="Surah Asy-Syu'ara' : 80"
                    className={styles.inputField}
                    value={formRujukan}
                    onChange={(e) => setFormRujukan(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Kategori:</label>
                  <select
                    className={styles.selectField}
                    value={formKategoriTicker}
                    onChange={(e) => setFormKategoriTicker(e.target.value)}
                  >
                    <option value="makluman">Makluman Pentadbiran</option>
                    <option value="ayat_syifa">Ayat Syifa&apos; &amp; Doa</option>
                    <option value="promosi">Promosi &amp; Hebahan</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalActions} style={{ marginTop: '1.25rem' }}>
                <button type="button" onClick={() => { setBukaModalTicker(false); setTickerDiedit(null); }} className={styles.btnCancel}>
                  Batal
                </button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}>
                  <PlusCircle size={14} /> {tickerDiedit ? 'Simpan Kemaskini' : 'Tambah Ticker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: LANTIKAN ADMIN */}
      {bukaModalAdmin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Lantik Pentadbir Baharu</h3>
              <button onClick={() => setBukaModalAdmin(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={ciptaAdminBaharu}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Nama Pentadbir:</label>
                  <input type="text" required className={styles.inputField} value={adminNama} onChange={(e) => setAdminNama(e.target.value)} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>E-mel Log Masuk:</label>
                  <input type="email" required className={styles.inputField} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Kata Laluan:</label>
                  <input type="password" required className={styles.inputField} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setBukaModalAdmin(false)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}><UserCheck size={14} /> Sahkan Lantikan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: DAFTAR INVENTORI */}
      {bukaModalTambahBahan && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Daftar Item Baharu</h3>
              <button onClick={() => setBukaModalTambahBahan(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpanItemBaharu}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Nama Item:</label>
                  <input type="text" required className={styles.inputField} value={formNama} onChange={(e) => setFormNama(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Harga Jualan (RM):</label>
                  <input type="number" step="0.01" required className={styles.inputField} value={formHarga} onChange={(e) => setFormHarga(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Baki Stok:</label>
                  <input type="number" className={styles.inputField} value={formStokAwal} onChange={(e) => setFormStokAwal(e.target.value)} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setBukaModalTambahBahan(false)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}><PlusCircle size={14} /> Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10: EDIT ITEM INVENTORI */}
      {itemDiedit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Kemaskini Item Inventori</h3>
              <button type="button" onClick={() => setItemDiedit(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpanKemaskiniItem}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Nama Item:</label>
                  <input type="text" required className={styles.inputField} value={formNama} onChange={(e) => setFormNama(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Kategori:</label>
                  <input type="text" required className={styles.inputField} value={formKategori} onChange={(e) => setFormKategori(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Harga Jualan (RM):</label>
                  <input type="number" step="0.01" required className={styles.inputField} value={formHarga} onChange={(e) => setFormHarga(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Baki Stok Semasa:</label>
                  <input type="number" required className={styles.inputField} value={formStokAwal} onChange={(e) => setFormStokAwal(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Tahap Amaran Stok:</label>
                  <input type="number" required className={styles.inputField} value={formTahapAmaran} onChange={(e) => setFormTahapAmaran(e.target.value)} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setItemDiedit(null)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction} style={{ fontWeight: 500 }}><Edit size={14} /> Simpan Kemaskini</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}