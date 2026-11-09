'use client';

import React, { useState, useEffect } from 'react';
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
  MapPin,
  Film,
  Volume2,
  Calendar,
  TrendingUp,
  DoorOpen,
  Radio
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

export default function PapanPemukaAdmin() {
  const router = useRouter();
  const [sedangSemakSesi, setSedangSemakSesi] = useState(true);
  const [profilAdmin, setProfilAdmin] = useState<AdminProfil | null>(null);

  // Tab Utama
  const [tabAktif, setTabAktif] = useState<string>('kewangan');
  const [subTabInventori, setSubTabInventori] = useState<'baki' | 'masuk' | 'keluar' | 'semua'>('baki');

  // Data Kewangan (Hari Ini, Mingguan, Bulanan & Tahunan)
  const [senaraiTransaksi, setSenaraiTransaksi] = useState<any[]>([]);
  const [jumlahKutipanHariIni, setJumlahKutipanHariIni] = useState(0);
  const [jumlahKutipanMingguan, setJumlahKutipanMingguan] = useState(0);
  const [jumlahKutipanBulanan, setJumlahKutipanBulanan] = useState(0);
  const [jumlahKutipanTahunan, setJumlahKutipanTahunan] = useState(0);
  const [kutipanTunai, setKutipanTunai] = useState(0);
  const [kutipanQR, setKutipanQR] = useState(0);

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
  const [formNamaBilik, setFormNamaBilik] = useState('');

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

  // 1. Semakan Sesi
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

  // 2. Muat Data
  const muatDataKewangan = async () => {
    const kini = new Date();
    const tarikhHariIni = kini.toISOString().split('T')[0];

    const tahunSemasa = kini.getFullYear();
    const tarikhMulaTahun = `${tahunSemasa}-01-01`;

    const bulanSemasa = String(kini.getMonth() + 1).padStart(2, '0');
    const tarikhMulaBulan = `${tahunSemasa}-${bulanSemasa}-01`;

    const hariMinggu = kini.getDay();
    const diffKeIsnin = hariMinggu === 0 ? -6 : 1 - hariMinggu;
    const tarikhIsnin = new Date(kini);
    tarikhIsnin.setDate(kini.getDate() + diffKeIsnin);
    const tarikhMulaMinggu = tarikhIsnin.toISOString().split('T')[0];

    const { data: dataHariIni } = await supabase
      .from('lejar_kewangan')
      .select('*, pesakit(nama, no_ic)')
      .eq('tarikh', tarikhHariIni)
      .order('created_at', { ascending: false });

    if (dataHariIni) {
      setSenaraiTransaksi(dataHariIni);
      let totalHariIni = 0;
      let tunai = 0;
      let qr = 0;

      dataHariIni.forEach((trx) => {
        const val = Number(trx.jumlah) || 0;
        if (trx.jenis_transaksi === 'masuk') {
          totalHariIni += val;
          if (trx.kaedah_bayaran === 'tunai') tunai += val;
          if (trx.kaedah_bayaran === 'duitnow_qr') qr += val;
        }
      });

      setJumlahKutipanHariIni(totalHariIni);
      setKutipanTunai(tunai);
      setKutipanQR(qr);
    }

    const { data: dataSemuaMasuk } = await supabase
      .from('lejar_kewangan')
      .select('jumlah, tarikh, jenis_transaksi, created_at')
      .eq('jenis_transaksi', 'masuk');

    if (dataSemuaMasuk) {
      let totalMingguan = 0;
      let totalBulanan = 0;
      let totalTahunan = 0;

      dataSemuaMasuk.forEach((trx) => {
        const val = Number(trx.jumlah) || 0;
        const tarikhTrx = trx.tarikh || (trx.created_at ? trx.created_at.split('T')[0] : '');

        if (tarikhTrx >= tarikhMulaTahun) totalTahunan += val;
        if (tarikhTrx >= tarikhMulaBulan) totalBulanan += val;
        if (tarikhTrx >= tarikhMulaMinggu) totalMingguan += val;
      });

      setJumlahKutipanMingguan(totalMingguan);
      setJumlahKutipanBulanan(totalBulanan);
      setJumlahKutipanTahunan(totalTahunan);
    }
  };

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
      if (profilAdmin.peranan === 'super_admin' || profilAdmin.peranan === 'admin_kewangan_inventori') {
        muatDataKewangan();
        muatDataInventori();
      }
      if (profilAdmin.peranan === 'super_admin' || profilAdmin.peranan === 'admin_pesakit') {
        muatDataPesakit();
      }
      if (profilAdmin.peranan === 'super_admin') {
        muatDataPerawat();
        muatDataBilik();
        muatDataVideo();
        muatDataTicker();
        muatDataAdmin();
      }
    }
  }, [sedangSemakSesi, profilAdmin]);

  // A. Inventori
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

  // B. Pesakit
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

  // C. Perawat
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

  const simpanBilikBaharu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaBilik.trim()) return;
    setMemproses(true);
    try {
      await supabase.from('bilik_rawatan').insert({
        nama_bilik: formNamaBilik.trim(),
        status: 'kosong',
        status_aktif: true
      });
      setBukaModalBilik(false);
      setFormNamaBilik('');
      muatDataBilik();
    } finally {
      setMemproses(false);
    }
  };

  // E. Video TV (Tambah, Edit & Padam)
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

  // F. Siaran Ticker TV (Tambah, Edit, Toggle & Padam)
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

  // G. Admin
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

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: '1rem' }} className={styles.noPrint}>
        <Link href="/" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Menu Utama
        </Link>
      </div>

      <div className={styles.printHeaderInfo}>
        <h1 className={styles.printClinicTitle}>Pusat Rawatan Islam Darul Syifa'</h1>
        <p className={styles.printReportTitle}>LAPORAN SISTEM PENGURUSAN SYIFALINK</p>
        <p className={styles.printMeta}>Tarikh: {new Date().toLocaleDateString('ms-MY')}</p>
      </div>

      <header className={`${styles.header} ${styles.noPrint}`}>
        <div>
          <h1 className={styles.title}>
            <Layers size={28} /> Pusat Pentadbir
            <span className={styles.adminRoleBadge}>
              {profilAdmin?.peranan.replace(/_/g, ' ')}
            </span>
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Log masuk sebagai: <strong>{profilAdmin?.nama}</strong> ({profilAdmin?.email})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => window.print()} style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Printer size={16} /> Cetak
          </button>
          <button onClick={tanganiLogKeluar} style={{ backgroundColor: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </header>

      {/* Navigasi Tab */}
      <div className={`${styles.tabBar} ${styles.noPrint}`}>
        {isKewangan && (
          <>
            <button onClick={() => setTabAktif('kewangan')} className={`${styles.tabBtn} ${tabAktif === 'kewangan' ? styles.tabBtnActive : ''}`}>
              <DollarSign size={18} /> Aliran Tunai & Penyata
            </button>
            <button onClick={() => setTabAktif('inventori')} className={`${styles.tabBtn} ${tabAktif === 'inventori' ? styles.tabBtnActive : ''}`}>
              <Package size={18} /> Inventori & Stok
            </button>
          </>
        )}

        {isPesakit && (
          <button onClick={() => setTabAktif('pesakit')} className={`${styles.tabBtn} ${tabAktif === 'pesakit' ? styles.tabBtnActive : ''}`}>
            <Users size={18} /> Direktori & Sejarah Pesakit
          </button>
        )}

        {isSuper && (
          <>
            <button onClick={() => setTabAktif('perawat')} className={`${styles.tabBtn} ${tabAktif === 'perawat' ? styles.tabBtnActive : ''}`}>
              <Stethoscope size={18} /> Portfolio Perawat
            </button>
            <button onClick={() => setTabAktif('bilik')} className={`${styles.tabBtn} ${tabAktif === 'bilik' ? styles.tabBtnActive : ''}`}>
              <DoorOpen size={18} /> Kawalan Bilik Rawatan
            </button>
            <button onClick={() => setTabAktif('video')} className={`${styles.tabBtn} ${tabAktif === 'video' ? styles.tabBtnActive : ''}`}>
              <Film size={18} /> Siaran Video TV
            </button>
            <button onClick={() => setTabAktif('ticker')} className={`${styles.tabBtn} ${tabAktif === 'ticker' ? styles.tabBtnActive : ''}`}>
              <Radio size={18} /> Siaran Ticker TV
            </button>
            <button onClick={() => setTabAktif('admin')} className={`${styles.tabBtn} ${tabAktif === 'admin' ? styles.tabBtnActive : ''}`}>
              <UserCheck size={18} /> Lantikan Pentadbir
            </button>
          </>
        )}
      </div>

      {/* ===================== TAB 1: ALIRAN TUNAI & PENYATA ===================== */}
      {tabAktif === 'kewangan' && isKewangan && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ backgroundColor: '#1e293b', border: '1.5px solid #059669', borderRadius: '0.75rem', padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <TrendingUp size={16} /> Kutipan Hari Ini
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', marginTop: '0.4rem' }}>
                RM {jumlahKutipanHariIni.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', border: '1.5px solid #0891b2', borderRadius: '0.75rem', padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#22d3ee', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <Calendar size={16} /> Kutipan Minggu Ini
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#06b6d4', marginTop: '0.4rem' }}>
                RM {jumlahKutipanMingguan.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', border: '1.5px solid #0284c7', borderRadius: '0.75rem', padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <Calendar size={16} /> Kutipan Bulan Ini
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.4rem' }}>
                RM {jumlahKutipanBulanan.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', border: '1.5px solid #7c3aed', borderRadius: '0.75rem', padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <DollarSign size={16} /> Kutipan Tahun Ini
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#a855f7', marginTop: '0.4rem' }}>
                RM {jumlahKutipanTahunan.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Kutipan Tunai Hari Ini (Laci):</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', marginTop: '0.3rem' }}>
                RM {kutipanTunai.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Kutipan DuitNow QR Hari Ini (Bank):</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.3rem' }}>
                RM {kutipanQR.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Bilangan Resit Hari Ini:</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.3rem' }}>
                {senaraiTransaksi.length} Resit
              </div>
            </div>
          </div>

          <div className={styles.cardPanel}>
            <h2 className={styles.panelTitle}>Rekod Transaksi Masuk Hari Ini</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                    <th>No. Resit</th>
                    <th>Hari / Tarikh</th>
                    <th>Masa</th>
                    <th>Pesakit</th>
                    <th>Kaedah</th>
                    <th style={{ textAlign: 'right' }}>Jumlah (RM)</th>
                  </tr>
                </thead>
                <tbody>
                  {senaraiTransaksi.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Belum ada transaksi direkodkan untuk hari ini.
                      </td>
                    </tr>
                  ) : (
                    senaraiTransaksi.map((trx, idx) => (
                      <tr key={trx.id}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ color: '#38bdf8' }}>{trx.no_resit}</td>
                        <td>{new Date(trx.created_at).toLocaleDateString('ms-MY')}</td>
                        <td>{new Date(trx.created_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{trx.pesakit?.nama || 'Pesakit Am'}</td>
                        <td><span className={`${styles.badgeMethod} ${trx.kaedah_bayaran === 'tunai' ? styles.methodCash : styles.methodQR}`}>{trx.kaedah_bayaran === 'tunai' ? 'Tunai' : 'DuitNow QR'}</span></td>
                        <td style={{ textAlign: 'right', color: '#34d399' }}>+RM {Number(trx.jumlah).toFixed(2)}</td>
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
        <div>
          <div className={styles.subTabBar}>
            <button onClick={() => setSubTabInventori('baki')} className={`${styles.subTabBtn} ${subTabInventori === 'baki' ? styles.subTabBtnActive : ''}`}>Katalog Item</button>
            <button onClick={() => setSubTabInventori('masuk')} className={`${styles.subTabBtn} ${subTabInventori === 'masuk' ? styles.subTabMasukActive : ''}`}>Stok Masuk</button>
            <button onClick={() => setSubTabInventori('keluar')} className={`${styles.subTabBtn} ${subTabInventori === 'keluar' ? styles.subTabKeluarActive : ''}`}>Stok Keluar</button>
          </div>

          {subTabInventori === 'baki' && (
            <div className={styles.cardPanel}>
              <div className={styles.tableHeaderActionRow}>
                <div><h2 className={styles.panelTitle} style={{ margin: 0 }}>Katalog Inventori & Stok Semasa</h2></div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedBahan.length > 0 && (
                    <button onClick={padamBahanPukal} disabled={memproses} className={styles.btnBulkDelete}>
                      <Trash2 size={15} /> Padam Terpilih ({selectedBahan.length})
                    </button>
                  )}
                  <button onClick={() => setBukaModalTambahBahan(true)} className={styles.btnAction}>
                    <PlusCircle size={16} /> Daftar Item
                  </button>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input type="checkbox" className={styles.tableCheckbox} checked={senaraiBahan.length > 0 && selectedBahan.length === senaraiBahan.length} onChange={toggleSelectAllBahan} />
                      </th>
                      <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                      <th>Nama Item</th>
                      <th>Kategori</th>
                      <th>Harga</th>
                      <th>Baki</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {senaraiBahan.map((b, idx) => (
                      <tr key={b.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" className={styles.tableCheckbox} checked={selectedBahan.includes(b.id)} onChange={() => toggleSelectBahan(b.id)} />
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td>{b.nama_item}</td>
                        <td>{b.kategori}</td>
                        <td>RM {Number(b.harga).toFixed(2)}</td>
                        <td>{b.stok_semasa} unit</td>
                        <td>{b.stok_semasa <= b.tahap_amaran ? <span className={styles.badgeLow}>Rendah</span> : <span className={styles.badgeOk}>Cukup</span>}</td>
                        <td>
                          <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                            <button onClick={() => { setItemDiedit(b); setFormNama(b.nama_item); setFormKategori(b.kategori); setFormHarga(String(b.harga)); setFormStokAwal(String(b.stok_semasa)); setFormTahapAmaran(String(b.tahap_amaran)); }} className={styles.btnEdit}>
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
                <h2 className={styles.panelTitle}>Kemasukan Stok Masuk</h2>
                <form onSubmit={masukkanStok} className={styles.stockFormGrid}>
                  <select className={styles.selectField} value={bahanPilihanId} onChange={(e) => setBahanPilihanId(e.target.value)}>
                    {senaraiBahan.map(b => <option key={b.id} value={b.id}>{b.nama_item} (Baki: {b.stok_semasa})</option>)}
                  </select>
                  <input type="number" placeholder="Kuantiti" className={styles.inputField} value={kuantitiTambah} onChange={(e) => setKuantitiTambah(e.target.value)} />
                  <input type="text" placeholder="Catatan Pembekal" className={styles.inputField} value={catatanStok} onChange={(e) => setCatatanStok(e.target.value)} />
                  <button type="submit" disabled={memproses} className={styles.btnAction}><PlusCircle size={16} /> Tambah</button>
                </form>
              </div>
            </div>
          )}

          {subTabInventori === 'keluar' && (
            <div className={styles.cardPanel}>
              <h2 className={styles.panelTitle}>Rekod Stok Keluar (Jualan Kaunter)</h2>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                      <th>Tarikh & Masa</th>
                      <th>Item</th>
                      <th>Kuantiti Keluar</th>
                      <th>Baki Tinggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {senaraiLog.filter(l => l.jenis_pergerakan === 'keluar').map((l, idx) => (
                      <tr key={l.id}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td>{new Date(l.created_at).toLocaleString('ms-MY')}</td>
                        <td>{l.bahan_penawar?.nama_item}</td>
                        <td style={{ color: '#f87171' }}>-{l.kuantiti}</td>
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
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div><h2 className={styles.panelTitle} style={{ margin: 0 }}>Direktori Pesakit & Rekod Rawatan</h2></div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {selectedPesakit.length > 0 && (
                <button onClick={padamPesakitPukal} disabled={memproses} className={styles.btnBulkDelete}>
                  <Trash2 size={15} /> Padam Terpilih ({selectedPesakit.length})
                </button>
              )}
              <input type="text" placeholder="Cari nama, No. IC, atau No. Tel..." className={styles.searchBar} value={carianPesakit} onChange={(e) => setCarianPesakit(e.target.value)} />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input type="checkbox" className={styles.tableCheckbox} checked={senaraiPesakitDitapis.length > 0 && selectedPesakit.length === senaraiPesakitDitapis.length} onChange={toggleSelectAllPesakit} />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Nama Pesakit</th>
                  <th>No. Kad Pengenalan</th>
                  <th>No. Telefon</th>
                  <th>Alamat Kediaman</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {senaraiPesakitDitapis.map((p, idx) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" className={styles.tableCheckbox} checked={selectedPesakit.includes(p.id)} onChange={() => toggleSelectPesakit(p.id)} />
                    </td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ color: '#f1f5f9' }}>{p.nama}</td>
                    <td>{p.no_ic}</td>
                    <td>{p.no_telefon}</td>
                    <td>{p.alamat || <span style={{ color: '#64748b' }}>Belum diisi</span>}</td>
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
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div><h2 className={styles.panelTitle} style={{ margin: 0 }}>Pengurusan Portfolio & Tauliah Perawat</h2></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedPerawat.length > 0 && (
                <button onClick={padamPerawatPukal} disabled={memproses} className={styles.btnBulkDelete}>
                  <Trash2 size={15} /> Padam Terpilih ({selectedPerawat.length})
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
              >
                <PlusCircle size={16} /> Lantik Perawat Baharu
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input type="checkbox" className={styles.tableCheckbox} checked={senaraiPerawat.length > 0 && selectedPerawat.length === senaraiPerawat.length} onChange={toggleSelectAllPerawat} />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Nama Perawat</th>
                  <th>No. Telefon</th>
                  <th>Kelayakan / Tauliah</th>
                  <th>Bidang Tumpuan Ruqyah</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {senaraiPerawat.map((u, idx) => (
                  <tr key={u.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" className={styles.tableCheckbox} checked={selectedPerawat.includes(u.id)} onChange={() => toggleSelectPerawat(u.id)} />
                    </td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ color: '#f1f5f9' }}>{u.nama}</td>
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

      {/* ========================================================
          TAB 5: KAWALAN BILIK RAWATAN (DIPULIHKAN SEPENUHNYA - GAMBAR 2)
         ======================================================== */}
      {tabAktif === 'bilik' && isSuper && (
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>Kawalan Bilik Rawatan Fizikal</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Pantau perawat yang sedang *check-in* di setiap bilik dan lepaskan bilik jika berlaku kekeliruan syif
              </p>
            </div>
            <button onClick={() => setBukaModalBilik(true)} className={styles.btnAction}>
              <PlusCircle size={16} /> Tambah Bilik Rawatan
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Nama Bilik</th>
                  <th>Tabib Bertugas Semasa</th>
                  <th>Sesi</th>
                  <th>Status Penggunaan</th>
                  <th>Operasi Bilik</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {senaraiBilik.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Tiada bilik rawatan didaftarkan.
                    </td>
                  </tr>
                ) : (
                  senaraiBilik.map((b, idx) => (
                    <tr key={b.id}>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ color: '#f1f5f9', fontWeight: 700 }}>{b.nama_bilik}</td>
                      <td>
                        {b.perawat?.nama ? (
                          <span style={{ color: '#38bdf8', fontWeight: 600 }}>{b.perawat.nama}</span>
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
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {b.status_aktif ? 'Buka (Aktif)' : 'Tutup Bilik'}
                        </button>
                      </td>
                      <td>
                        <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
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

      {/* ========================================================
          TAB 6: SIARAN VIDEO TV (DENGAN BUTANG EDIT - GAMBAR 3)
         ======================================================== */}
      {tabAktif === 'video' && isSuper && (
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>Pengurusan Siaran Video Skrin TV</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Tetapkan pautan YouTube atau fail MP4 untuk dimainkan di kotak dewan menunggu
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedVideo.length > 0 && (
                <button type="button" onClick={padamVideoPukal} disabled={memproses} className={styles.btnBulkDelete}>
                  <Trash2 size={15} /> Padam Terpilih ({selectedVideo.length})
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
              >
                <PlusCircle size={16} /> Tambah Video TV
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
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
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Tajuk Video</th>
                  <th>Jenis Media</th>
                  <th>Pautan / URL</th>
                  <th>Mod Mainan</th>
                  <th>Kelantangan Audio</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {senaraiVideo.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
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
                      <td style={{ color: '#f1f5f9', fontWeight: 700 }}>{v.tajuk}</td>
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
                          <span style={{ color: '#fbbf24', fontWeight: 700 }}>🔄 Berulang (Loop)</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>🔀 Main Rawak</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: v.kelantangan_audio === 0 ? '#64748b' : v.kelantangan_audio <= 30 ? '#34d399' : '#f59e0b' }}>
                          {v.kelantangan_audio === 0 ? 'Bisu (0%)' : `${v.kelantangan_audio}%`}
                        </span>
                      </td>
                      <td>
                        {/* BUTANG EDIT & PADAM (GAMBAR 3) */}
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
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            disabled={memproses}
                            onClick={() => tanganiPadamSatuVideo(v.id)}
                            className={styles.btnBulkDelete}
                            style={{ padding: '0.35rem 0.65rem' }}
                          >
                            <Trash2 size={13} /> Padam
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

      {/* ========================================================
          TAB 7: SIARAN TICKER TV (DIPULIHKAN SEPENUHNYA - GAMBAR 4)
         ======================================================== */}
      {tabAktif === 'ticker' && isSuper && (
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>Pengurusan Siaran Ticker (Teks Bergerak TV)</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
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
            >
              <PlusCircle size={16} /> Tambah Mesej Ticker
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Kategori</th>
                  <th>Teks Maksud / Pengumuman</th>
                  <th>Teks Arab (Pilihan)</th>
                  <th>Rujukan</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
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
                          textTransform: 'uppercase'
                        }}>
                          {t.kategori ? t.kategori.replace('_', ' ') : 'MAKLUMAN'}
                        </span>
                      </td>
                      <td style={{ color: '#f1f5f9', fontWeight: 600 }}>{t.teks_maksud}</td>
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
                            fontWeight: 700,
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
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => padamTicker(t.id)}
                            className={styles.btnBulkDelete}
                            style={{ padding: '0.35rem 0.65rem' }}
                          >
                            <Trash2 size={13} /> Padam
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

      {/* ===================== TAB 8: LANTIKAN PENTADBIR ===================== */}
      {tabAktif === 'admin' && isSuper && (
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div><h2 className={styles.panelTitle} style={{ margin: 0 }}>Pengurusan & Lantikan Pentadbir Sistem</h2></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedAdmin.length > 0 && (
                <button onClick={padamAdminPukal} disabled={memproses} className={styles.btnBulkDelete}>
                  <Trash2 size={15} /> Padam Terpilih ({selectedAdmin.length})
                </button>
              )}
              <button onClick={() => setBukaModalAdmin(true)} className={styles.btnAction}>
                <PlusCircle size={16} /> Lantik Pentadbir Baharu
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input type="checkbox" className={styles.tableCheckbox} checked={adminBolehDipadam.length > 0 && selectedAdmin.length === adminBolehDipadam.length} onChange={toggleSelectAllAdmin} />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Nama Pentadbir</th>
                  <th>E-mel</th>
                  <th>Peranan Capaian</th>
                  <th>Tarikh Lantikan</th>
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
                      <td style={{ color: '#f1f5f9' }}>{adm.nama}</td>
                      <td>{adm.email}</td>
                      <td>
                        <span className={styles.adminRoleBadge}>
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

      {/* ========================================================
          MODAL-MODAL SISTEM (DIPERBAIKI PENUH)
         ======================================================== */}

      {/* MODAL 1: EDIT PESAKIT */}
      {pesakitDiedit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Kemaskini Profil & Alamat Pesakit</h3>
              <button onClick={() => setPesakitDiedit(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpanKemaskiniPesakit}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Nama Penuh:</label>
                  <input type="text" required className={styles.inputField} value={pesakitDiedit.nama} onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, nama: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>No. Kad Pengenalan:</label>
                  <input type="text" required className={styles.inputField} value={pesakitDiedit.no_ic} onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, no_ic: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>No. Telefon:</label>
                  <input type="text" required className={styles.inputField} value={pesakitDiedit.no_telefon} onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, no_telefon: e.target.value })} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Alamat Kediaman Pesakit:</label>
                  <textarea rows={3} className={styles.inputField} value={pesakitDiedit.alamat || ''} onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, alamat: e.target.value })} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setPesakitDiedit(null)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction}><Edit size={16} /> Simpan Maklumat</button>
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
                      <strong style={{ color: '#38bdf8' }}>{s.perawat?.nama}</strong>
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

      {/* MODAL 3: PORTFOLIO PERAWAT (DITAMBAH MEDAN KELAYAKAN & KEPAKARAN - GAMBAR 1) */}
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Nama Penuh (Beserta Gelaran):</label>
                  <input type="text" required placeholder="cth: Ustaz Dr. Amri Mahmud" className={styles.inputField} value={perawatDiedit.nama} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, nama: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>No. Bilik Rawatan:</label>
                  <input type="text" disabled className={styles.inputField} value="Ditetapkan Semasa Check-In" style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#0f172a' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>No. Telefon:</label>
                  <input type="text" placeholder="012-3456789" className={styles.inputField} value={perawatDiedit.no_telefon || ''} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, no_telefon: e.target.value })} />
                </div>
                {/* MEDAN KELAYAKAN / KELULUSAN (GAMBAR 1) */}
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Kelayakan / Sijil Tauliah:</label>
                  <input
                    type="text"
                    placeholder="cth: Sijil Rawatan Islam Darul Syifa (Kohort 2020)"
                    className={styles.inputField}
                    value={perawatDiedit.kelayakan || ''}
                    onChange={(e) => setPerawatDiedit({ ...perawatDiedit, kelayakan: e.target.value })}
                  />
                </div>
                {/* MEDAN KEPAKARAN / BIDANG TUMPUAN (GAMBAR 1) */}
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Bidang Tumpuan / Kepakaran Ruqyah:</label>
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
                <button type="submit" disabled={memproses} className={styles.btnAction}><PlusCircle size={16} /> Simpan Portfolio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH BILIK RAWATAN */}
      {bukaModalBilik && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Daftar Bilik Rawatan Baharu</h3>
              <button onClick={() => setBukaModalBilik(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpanBilikBaharu}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Nama Bilik Fizikal:</label>
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
                <button type="button" onClick={() => setBukaModalBilik(false)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction}><PlusCircle size={16} /> Simpan Bilik</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: TAMBAH / EDIT VIDEO TV (GAMBAR 3) */}
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Tajuk / Penerangan Video:</label>
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Pautan YouTube atau URL Fail MP4:</label>
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Jenis Media:</label>
                  <select
                    className={styles.selectField}
                    value={formJenisVideo}
                    onChange={(e: any) => setFormJenisVideo(e.target.value)}
                  >
                    <option value="youtube">YouTube Video</option>
                    <option value="mp4">Fail Video MP4 Terus</option>
                  </select>
                </div>

                <div className={styles.formGroupFull} style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '0.65rem', border: '1.5px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Volume2 size={16} /> Had Kelantangan Audio: {formKelantangan}%
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
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>
                      Ulang video ini sahaja secara berterusan (Loop)?
                    </span>
                  </label>
                </div>
              </div>

              <div className={styles.modalActions} style={{ marginTop: '1.25rem' }}>
                <button type="button" onClick={() => { setBukaModalVideo(false); setVideoDiedit(null); }} className={styles.btnCancel}>
                  Batal
                </button>
                <button type="submit" disabled={memproses} className={styles.btnAction}>
                  <PlusCircle size={16} /> {videoDiedit ? 'Simpan Kemaskini' : 'Tambah Video ke TV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: TAMBAH / EDIT TICKER TV (GAMBAR 4) */}
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Teks Maksud / Pengumuman:</label>
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Teks Arab (Pilihan):</label>
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Rujukan (cth: Surah Asy-Syu'ara' : 80):</label>
                  <input
                    type="text"
                    placeholder="Surah Asy-Syu'ara' : 80"
                    className={styles.inputField}
                    value={formRujukan}
                    onChange={(e) => setFormRujukan(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Kategori:</label>
                  <select
                    className={styles.selectField}
                    value={formKategoriTicker}
                    onChange={(e) => setFormKategoriTicker(e.target.value)}
                  >
                    <option value="makluman">Makluman Pentadbiran</option>
                    <option value="ayat_syifa">Ayat Syifa' & Doa</option>
                    <option value="promosi">Promosi & Hebahan</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalActions} style={{ marginTop: '1.25rem' }}>
                <button type="button" onClick={() => { setBukaModalTicker(false); setTickerDiedit(null); }} className={styles.btnCancel}>
                  Batal
                </button>
                <button type="submit" disabled={memproses} className={styles.btnAction}>
                  <PlusCircle size={16} /> {tickerDiedit ? 'Simpan Kemaskini' : 'Tambah Ticker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: LANTIKAN ADMIN */}
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Nama Pentadbir:</label>
                  <input type="text" required className={styles.inputField} value={adminNama} onChange={(e) => setAdminNama(e.target.value)} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>E-mel Log Masuk:</label>
                  <input type="email" required className={styles.inputField} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Kata Laluan:</label>
                  <input type="password" required className={styles.inputField} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setBukaModalAdmin(false)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction}><UserCheck size={16} /> Sahkan Lantikan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: DAFTAR INVENTORI */}
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Nama Item:</label>
                  <input type="text" required className={styles.inputField} value={formNama} onChange={(e) => setFormNama(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Harga Jualan (RM):</label>
                  <input type="number" step="0.01" required className={styles.inputField} value={formHarga} onChange={(e) => setFormHarga(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Baki Stok:</label>
                  <input type="number" className={styles.inputField} value={formStokAwal} onChange={(e) => setFormStokAwal(e.target.value)} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setBukaModalTambahBahan(false)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction}><PlusCircle size={16} /> Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}