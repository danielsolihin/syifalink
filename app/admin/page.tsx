'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';
import { 
  Package, 
  DollarSign, 
  PlusCircle, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertTriangle, 
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
  CheckSquare,
  DoorOpen,
  Megaphone,
  CheckCircle,
  XCircle
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

interface BilikRawatan {
  id: number;
  nama_bilik: string;
  lokasi_fizikal?: string;
  status: string;
  status_aktif: boolean;
  susunan_turutan: number;
}

interface PengumumanTicker {
  id: string;
  teks_arab?: string;
  teks_maksud: string;
  rujukan?: string;
  kategori: 'ayat_syifa' | 'hadis' | 'makluman' | 'promosi';
  status_aktif: boolean;
  turutan: number;
}

interface AdminProfil {
  id: string;
  nama: string;
  email: string;
  peranan: 'super_admin' | 'admin_pesakit' | 'admin_kewangan_inventori';
  created_at?: string;
}

export default function PapanPemukaAdmin() {
  const router = useRouter();
  const [sedangSemakSesi, setSedangSemakSesi] = useState(true);
  const [profilAdmin, setProfilAdmin] = useState<AdminProfil | null>(null);

  // Tab Utama
  const [tabAktif, setTabAktif] = useState<string>('kewangan');
  const [subTabInventori, setSubTabInventori] = useState<'baki' | 'masuk' | 'keluar' | 'semua'>('baki');

  // Data Kewangan
  const [senaraiTransaksi, setSenaraiTransaksi] = useState<any[]>([]);
  const [jumlahKutipanHariIni, setJumlahKutipanHariIni] = useState(0);
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
  const [senaraiBilik, setSenaraiBilik] = useState<BilikRawatan[]>([]);
  const [bukaModalBilik, setBukaModalBilik] = useState(false);
  const [bilikDiedit, setBilikDiedit] = useState<BilikRawatan | null>(null);
  const [selectedBilik, setSelectedBilik] = useState<number[]>([]);

  // Data Siaran Ticker TV
  const [senaraiTicker, setSenaraiTicker] = useState<PengumumanTicker[]>([]);
  const [bukaModalTicker, setBukaModalTicker] = useState(false);
  const [tickerDiedit, setTickerDiedit] = useState<PengumumanTicker | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string[]>([]);

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
    const tarikhHariIni = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('lejar_kewangan')
      .select('*, pesakit(nama, no_ic)')
      .eq('tarikh', tarikhHariIni)
      .order('created_at', { ascending: false });

    if (data) {
      setSenaraiTransaksi(data);
      let total = 0; let tunai = 0; let qr = 0;
      data.forEach((trx) => {
        const val = Number(trx.jumlah) || 0;
        if (trx.jenis_transaksi === 'masuk') {
          total += val;
          if (trx.kaedah_bayaran === 'tunai') tunai += val;
          if (trx.kaedah_bayaran === 'duitnow_qr') qr += val;
        }
      });
      setJumlahKutipanHariIni(total);
      setKutipanTunai(tunai);
      setKutipanQR(qr);
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
      .order('no_bilik', { ascending: true });
    if (data) setSenaraiPerawat(data);
  };

  const muatDataBilik = async () => {
    const { data } = await supabase
      .from('bilik_rawatan')
      .select('*')
      .order('susunan_turutan', { ascending: true })
      .order('id', { ascending: true });
    if (data) setSenaraiBilik(data);
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
        muatDataTicker();
        muatDataAdmin();
      }
    }
  }, [sedangSemakSesi, profilAdmin]);

  // -------------------------------------------------------------
  // FUNGSI SELECT ALL & PADAM PUKAL
  // -------------------------------------------------------------

  // A. Inventori
  const toggleSelectAllBahan = () => {
    if (selectedBahan.length === senaraiBahan.length) {
      setSelectedBahan([]);
    } else {
      setSelectedBahan(senaraiBahan.map(b => b.id));
    }
  };

  const toggleSelectBahan = (id: string) => {
    setSelectedBahan(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const padamBahanPukal = async () => {
    const sah = window.confirm(`Adakah anda pasti mahu memadam ${selectedBahan.length} item inventori yang dipilih?`);
    if (!sah) return;

    setMemproses(true);
    try {
      const { error } = await supabase
        .from('bahan_penawar')
        .delete()
        .in('id', selectedBahan);

      if (error) throw error;

      alert(`${selectedBahan.length} item berjaya dipadam!`);
      setSelectedBahan([]);
      muatDataInventori();
    } catch (err: any) {
      alert('Ralat memadam item: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // B. Pesakit
  const senaraiPesakitDitapis = senaraiPesakit.filter(p => 
    p.nama.toLowerCase().includes(carianPesakit.toLowerCase()) ||
    p.no_ic.includes(carianPesakit) ||
    p.no_telefon.includes(carianPesakit)
  );

  const toggleSelectAllPesakit = () => {
    if (selectedPesakit.length === senaraiPesakitDitapis.length) {
      setSelectedPesakit([]);
    } else {
      setSelectedPesakit(senaraiPesakitDitapis.map(p => p.id));
    }
  };

  const toggleSelectPesakit = (id: string) => {
    setSelectedPesakit(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const padamPesakitPukal = async () => {
    const sah = window.confirm(`AMARAN: Adakah anda pasti mahu memadam ${selectedPesakit.length} rekod pesakit yang dipilih beserta data sejarah mereka?`);
    if (!sah) return;

    setMemproses(true);
    try {
      const { error } = await supabase
        .from('pesakit')
        .delete()
        .in('id', selectedPesakit);

      if (error) throw error;

      alert(`${selectedPesakit.length} rekod pesakit berjaya dipadam!`);
      setSelectedPesakit([]);
      muatDataPesakit();
    } catch (err: any) {
      alert('Ralat memadam pesakit: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // C. Perawat
  const toggleSelectAllPerawat = () => {
    if (selectedPerawat.length === senaraiPerawat.length) {
      setSelectedPerawat([]);
    } else {
      setSelectedPerawat(senaraiPerawat.map(u => u.id));
    }
  };

  const toggleSelectPerawat = (id: string) => {
    setSelectedPerawat(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const padamPerawatPukal = async () => {
    const sah = window.confirm(`Adakah anda pasti mahu memadam ${selectedPerawat.length} perawat yang dipilih?`);
    if (!sah) return;

    setMemproses(true);
    try {
      const { error } = await supabase
        .from('perawat')
        .delete()
        .in('id', selectedPerawat);

      if (error) throw error;

      alert(`${selectedPerawat.length} perawat berjaya dipadam!`);
      setSelectedPerawat([]);
      muatDataPerawat();
    } catch (err: any) {
      alert('Ralat memadam perawat: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // D. Bilik Rawatan
  const toggleSelectAllBilik = () => {
    if (selectedBilik.length === senaraiBilik.length) {
      setSelectedBilik([]);
    } else {
      setSelectedBilik(senaraiBilik.map(b => b.id));
    }
  };

  const toggleSelectBilik = (id: number) => {
    setSelectedBilik(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const padamBilikPukal = async () => {
    const sah = window.confirm(`Adakah anda pasti mahu memadam ${selectedBilik.length} bilik rawatan yang dipilih?`);
    if (!sah) return;

    setMemproses(true);
    try {
      const { error } = await supabase
        .from('bilik_rawatan')
        .delete()
        .in('id', selectedBilik);

      if (error) throw error;

      alert(`${selectedBilik.length} bilik rawatan berjaya dipadam!`);
      setSelectedBilik([]);
      muatDataBilik();
    } catch (err: any) {
      alert('Ralat memadam bilik: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // E. Ticker Siaran TV
  const toggleSelectAllTicker = () => {
    if (selectedTicker.length === senaraiTicker.length) {
      setSelectedTicker([]);
    } else {
      setSelectedTicker(senaraiTicker.map(t => t.id));
    }
  };

  const toggleSelectTicker = (id: string) => {
    setSelectedTicker(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const padamTickerPukal = async () => {
    const sah = window.confirm(`Adakah anda pasti mahu memadam ${selectedTicker.length} mesej ticker yang dipilih?`);
    if (!sah) return;

    setMemproses(true);
    try {
      const { error } = await supabase
        .from('pengumuman_ticker')
        .delete()
        .in('id', selectedTicker);

      if (error) throw error;

      alert(`${selectedTicker.length} mesej ticker berjaya dipadam!`);
      setSelectedTicker([]);
      muatDataTicker();
    } catch (err: any) {
      alert('Ralat memadam ticker: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // F. Admin
  const adminBolehDipadam = senaraiSemuaAdmin.filter(a => a.id !== profilAdmin?.id);

  const toggleSelectAllAdmin = () => {
    if (selectedAdmin.length === adminBolehDipadam.length) {
      setSelectedAdmin([]);
    } else {
      setSelectedAdmin(adminBolehDipadam.map(a => a.id));
    }
  };

  const toggleSelectAdmin = (id: string) => {
    setSelectedAdmin(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const padamAdminPukal = async () => {
    const sah = window.confirm(`Adakah anda pasti mahu memadam ${selectedAdmin.length} akaun pentadbir yang dipilih?`);
    if (!sah) return;

    setMemproses(true);
    try {
      const { error } = await supabase
        .from('admin_profil')
        .delete()
        .in('id', selectedAdmin);

      if (error) throw error;

      alert(`${selectedAdmin.length} akaun pentadbir berjaya dipadam!`);
      setSelectedAdmin([]);
      muatDataAdmin();
    } catch (err: any) {
      alert('Ralat memadam pentadbir: ' + err.message);
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
      const { error } = await supabase
        .from('pesakit')
        .update({
          nama: pesakitDiedit.nama.trim(),
          no_ic: pesakitDiedit.no_ic.trim(),
          no_telefon: pesakitDiedit.no_telefon.trim(),
          alamat: pesakitDiedit.alamat?.trim() || null
        })
        .eq('id', pesakitDiedit.id);

      if (error) throw error;

      alert('Profil pesakit berjaya dikemaskini!');
      setPesakitDiedit(null);
      muatDataPesakit();
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // Simpan Perawat
  const simpanPerawat = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemproses(true);

    try {
      if (perawatDiedit && perawatDiedit.id) {
        const { error } = await supabase
          .from('perawat')
          .update({
            nama: perawatDiedit.nama,
            no_bilik: perawatDiedit.no_bilik,
            no_ic: perawatDiedit.no_ic,
            no_telefon: perawatDiedit.no_telefon,
            kelayakan: perawatDiedit.kelayakan,
            bidang_khusus: perawatDiedit.bidang_khusus,
            status_aktif: perawatDiedit.status_aktif
          })
          .eq('id', perawatDiedit.id);
        if (error) throw error;
        alert('Maklumat perawat dikemaskini!');
      } else if (perawatDiedit) {
        const { error } = await supabase
          .from('perawat')
          .insert({
            nama: perawatDiedit.nama,
            no_bilik: perawatDiedit.no_bilik,
            no_ic: perawatDiedit.no_ic,
            no_telefon: perawatDiedit.no_telefon,
            kelayakan: perawatDiedit.kelayakan,
            bidang_khusus: perawatDiedit.bidang_khusus,
            status_aktif: true
          });
        if (error) throw error;
        alert('Perawat baharu didaftarkan!');
      }
      setPerawatDiedit(null);
      setBukaModalPerawat(false);
      muatDataPerawat();
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // Simpan Bilik Rawatan
  const simpanBilik = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bilikDiedit) return;
    setMemproses(true);

    try {
      if (bilikDiedit.id && bilikDiedit.id !== 0) {
        const { error } = await supabase
          .from('bilik_rawatan')
          .update({
            nama_bilik: bilikDiedit.nama_bilik.trim(),
            lokasi_fizikal: bilikDiedit.lokasi_fizikal?.trim() || null,
            status_aktif: bilikDiedit.status_aktif,
            susunan_turutan: bilikDiedit.susunan_turutan || 1
          })
          .eq('id', bilikDiedit.id);

        if (error) throw error;
        alert('Maklumat bilik rawatan berjaya dikemaskini!');
      } else {
        const { error } = await supabase
          .from('bilik_rawatan')
          .insert({
            nama_bilik: bilikDiedit.nama_bilik.trim(),
            lokasi_fizikal: bilikDiedit.lokasi_fizikal?.trim() || null,
            status_aktif: bilikDiedit.status_aktif ?? true,
            susunan_turutan: bilikDiedit.susunan_turutan || 1,
            status: 'kosong'
          });

        if (error) throw error;
        alert('Bilik rawatan baharu berjaya didaftarkan!');
      }
      setBukaModalBilik(false);
      setBilikDiedit(null);
      muatDataBilik();
    } catch (err: any) {
      alert('Ralat bilik: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  // Simpan Ticker Siaran TV
  const simpanTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerDiedit) return;
    setMemproses(true);

    try {
      if (tickerDiedit.id) {
        const { error } = await supabase
          .from('pengumuman_ticker')
          .update({
            teks_arab: tickerDiedit.teks_arab?.trim() || null,
            teks_maksud: tickerDiedit.teks_maksud.trim(),
            rujukan: tickerDiedit.rujukan?.trim() || null,
            kategori: tickerDiedit.kategori || 'ayat_syifa',
            status_aktif: tickerDiedit.status_aktif,
            turutan: tickerDiedit.turutan || 1
          })
          .eq('id', tickerDiedit.id);

        if (error) throw error;
        alert('Teks siaran TV dikemaskini!');
      } else {
        const { error } = await supabase
          .from('pengumuman_ticker')
          .insert({
            teks_arab: tickerDiedit.teks_arab?.trim() || null,
            teks_maksud: tickerDiedit.teks_maksud.trim(),
            rujukan: tickerDiedit.rujukan?.trim() || null,
            kategori: tickerDiedit.kategori || 'ayat_syifa',
            status_aktif: tickerDiedit.status_aktif ?? true,
            turutan: tickerDiedit.turutan || 1
          });

        if (error) throw error;
        alert('Teks siaran TV baharu didaftarkan!');
      }

      setBukaModalTicker(false);
      setTickerDiedit(null);
      muatDataTicker();
    } catch (err: any) {
      alert('Ralat ticker: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const toggleStatusTicker = async (item: PengumumanTicker) => {
    try {
      await supabase
        .from('pengumuman_ticker')
        .update({ status_aktif: !item.status_aktif })
        .eq('id', item.id);
      muatDataTicker();
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    }
  };

  // Cipta Admin
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

  // Logik Stok Masuk
  const masukkanStok = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(kuantitiTambah, 10);
    if (!bahanPilihanId || !qty || qty <= 0) return alert('Kuantiti tidak sah.');
    setMemproses(true);
    try {
      const bahan = senaraiBahan.find(b => b.id === bahanPilihanId);
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
            <button onClick={() => setTabAktif('ticker')} className={`${styles.tabBtn} ${tabAktif === 'ticker' ? styles.tabBtnActive : ''}`}>
              <Megaphone size={18} /> Siaran Ticker TV
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
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Jumlah Kutipan Hari Ini</div>
              <div className={styles.statValue} style={{ color: '#10b981' }}>RM {jumlahKutipanHariIni.toFixed(2)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Kutipan Tunai (Laci)</div>
              <div className={styles.statValue}>RM {kutipanTunai.toFixed(2)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Kutipan DuitNow QR (Bank)</div>
              <div className={styles.statValue} style={{ color: '#38bdf8' }}>RM {kutipanQR.toFixed(2)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Bilangan Resit</div>
              <div className={styles.statValue} style={{ color: '#f59e0b' }}>{senaraiTransaksi.length} Resit</div>
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
                <tfoot>
                  <tr className={styles.tableFooterRow}>
                    <td colSpan={5} style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>
                      * Menunjukkan keseluruhan transaksi rasmi yang direkodkan secara kekal
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#f1f5f9' }}>JUMLAH:</td>
                    <td style={{ textAlign: 'right', color: '#34d399', fontSize: '1rem' }}>RM {jumlahKutipanHariIni.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className={styles.summaryTotalBox}>
              <div className={styles.summaryRowMini}><span>Tunai:</span><span>RM {kutipanTunai.toFixed(2)}</span></div>
              <div className={styles.summaryRowMini}><span>DuitNow QR:</span><span>RM {kutipanQR.toFixed(2)}</span></div>
              <div className={styles.summaryRowTotal}><span style={{ fontWeight: 700 }}>TOTAL:</span><span>RM {jumlahKutipanHariIni.toFixed(2)}</span></div>
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
                <div>
                  <h2 className={styles.panelTitle} style={{ margin: 0 }}>Katalog Inventori & Stok Semasa</h2>
                </div>
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
                        <input
                          type="checkbox"
                          className={styles.tableCheckbox}
                          checked={senaraiBahan.length > 0 && selectedBahan.length === senaraiBahan.length}
                          onChange={toggleSelectAllBahan}
                          title="Pilih Semua"
                        />
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
                    {senaraiBahan.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Tiada item inventori didaftarkan.</td></tr>
                    ) : (
                      senaraiBahan.map((b, idx) => (
                        <tr key={b.id} style={{ backgroundColor: selectedBahan.includes(b.id) ? 'rgba(2, 132, 199, 0.1)' : undefined }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className={styles.tableCheckbox}
                              checked={selectedBahan.includes(b.id)}
                              onChange={() => toggleSelectBahan(b.id)}
                            />
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
                      ))
                    )}
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

              <div className={styles.cardPanel}>
                <h2 className={styles.panelTitle}>Sejarah Stok Masuk</h2>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                        <th>Tarikh & Masa</th>
                        <th>Item</th>
                        <th>Kuantiti Masuk</th>
                        <th>Baki Selepas</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {senaraiLog.filter(l => l.jenis_pergerakan === 'masuk').map((l, idx) => (
                        <tr key={l.id}>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td>{new Date(l.created_at).toLocaleString('ms-MY')}</td>
                          <td>{l.bahan_penawar?.nama_item}</td>
                          <td style={{ color: '#34d399' }}>+{l.kuantiti}</td>
                          <td>{l.baki_selepas} unit</td>
                          <td>{l.catatan || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                      <th>Rujukan</th>
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
                        <td>{l.catatan || '-'}</td>
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
            <div>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>Direktori Pesakit & Rekod Rawatan</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Semak profil lengkap, alamat kediaman, dan sejarah rawatan lampau</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {selectedPesakit.length > 0 && (
                <button onClick={padamPesakitPukal} disabled={memproses} className={styles.btnBulkDelete}>
                  <Trash2 size={15} /> Padam Terpilih ({selectedPesakit.length})
                </button>
              )}
              <input
                type="text"
                placeholder="Cari nama, No. IC, atau No. Tel..."
                className={styles.searchBar}
                value={carianPesakit}
                onChange={(e) => setCarianPesakit(e.target.value)}
              />
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
                      checked={senaraiPesakitDitapis.length > 0 && selectedPesakit.length === senaraiPesakitDitapis.length}
                      onChange={toggleSelectAllPesakit}
                      title="Pilih Semua"
                    />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Nama Pesakit</th>
                  <th>No. Kad Pengenalan</th>
                  <th>No. Telefon</th>
                  <th>Alamat Kediaman</th>
                  <th>Tarikh Daftar</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {senaraiPesakitDitapis.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Tiada rekod pesakit dijumpai.</td></tr>
                ) : (
                  senaraiPesakitDitapis.map((p, idx) => (
                    <tr key={p.id} style={{ backgroundColor: selectedPesakit.includes(p.id) ? 'rgba(2, 132, 199, 0.1)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className={styles.tableCheckbox}
                          checked={selectedPesakit.includes(p.id)}
                          onChange={() => toggleSelectPesakit(p.id)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ color: '#f1f5f9' }}>{p.nama}</td>
                      <td>{p.no_ic}</td>
                      <td>{p.no_telefon}</td>
                      <td>
                        {p.alamat ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={13} color="#38bdf8" /> {p.alamat}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontStyle: 'italic' }}>Belum diisi</span>
                        )}
                      </td>
                      <td>{new Date(p.created_at).toLocaleDateString('ms-MY')}</td>
                      <td>
                        <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                          <button onClick={() => setPesakitDiedit(p)} className={styles.btnEdit} title="Kemaskini Profil & Alamat">
                            <Edit size={12} /> Edit
                          </button>
                          <button onClick={() => bukaGarisMasaPesakit(p)} className={styles.btnHistory} title="Lihat Sejarah Rawatan Lampau">
                            <History size={12} /> Sejarah
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

      {/* ===================== TAB 4: PORTFOLIO PERAWAT ===================== */}
      {tabAktif === 'perawat' && isSuper && (
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>Pengurusan Portfolio & Tauliah Perawat</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Daftar ustaz/perawat bertugas lengkap dengan kelayakan & bidang kepakaran</p>
            </div>
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
                    no_bilik: 'Bilik 1',
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
                    <input
                      type="checkbox"
                      className={styles.tableCheckbox}
                      checked={senaraiPerawat.length > 0 && selectedPerawat.length === senaraiPerawat.length}
                      onChange={toggleSelectAllPerawat}
                      title="Pilih Semua"
                    />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Nama Perawat</th>
                  <th>No. Bilik</th>
                  <th>No. Telefon</th>
                  <th>Kelayakan / Tauliah</th>
                  <th>Bidang Tumpuan Ruqyah</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {senaraiPerawat.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Tiada perawat didaftarkan.</td></tr>
                ) : (
                  senaraiPerawat.map((u, idx) => (
                    <tr key={u.id} style={{ backgroundColor: selectedPerawat.includes(u.id) ? 'rgba(2, 132, 199, 0.1)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className={styles.tableCheckbox}
                          checked={selectedPerawat.includes(u.id)}
                          onChange={() => toggleSelectPerawat(u.id)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ color: '#f1f5f9' }}>{u.nama}</td>
                      <td><span className={styles.badgeMethod} style={{ backgroundColor: '#1e293b' }}>{u.no_bilik}</span></td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 5: KAWALAN BILIK RAWATAN (CRUD) ===================== */}
      {tabAktif === 'bilik' && isSuper && (
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>Pengurusan Bilik Rawatan Fizikal</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Paparan utama 3 bilik di TV. Jika melebihi 3 bilik, skrin dewan akan bergilir secara automatik setiap 12 saat.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedBilik.length > 0 && (
                <button onClick={padamBilikPukal} disabled={memproses} className={styles.btnBulkDelete}>
                  <Trash2 size={15} /> Padam Terpilih ({selectedBilik.length})
                </button>
              )}
              <button
                onClick={() => {
                  setBilikDiedit({
                    id: 0,
                    nama_bilik: `Bilik ${senaraiBilik.length + 1}`,
                    lokasi_fizikal: 'Aras Bawah',
                    status: 'kosong',
                    status_aktif: true,
                    susunan_turutan: senaraiBilik.length + 1
                  });
                  setBukaModalBilik(true);
                }}
                className={styles.btnAction}
              >
                <PlusCircle size={16} /> Tambah Bilik Rawatan
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
                      checked={senaraiBilik.length > 0 && selectedBilik.length === senaraiBilik.length}
                      onChange={toggleSelectAllBilik}
                      title="Pilih Semua"
                    />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Nama Bilik</th>
                  <th>Lokasi Fizikal</th>
                  <th>Susunan Turutan</th>
                  <th>Status Operasi</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {senaraiBilik.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Tiada bilik rawatan didaftarkan.</td></tr>
                ) : (
                  senaraiBilik.map((b, idx) => (
                    <tr key={b.id} style={{ backgroundColor: selectedBilik.includes(b.id) ? 'rgba(2, 132, 199, 0.1)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className={styles.tableCheckbox}
                          checked={selectedBilik.includes(b.id)}
                          onChange={() => toggleSelectBilik(b.id)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ color: '#f1f5f9', fontWeight: 700 }}>{b.nama_bilik}</td>
                      <td>{b.lokasi_fizikal || '-'}</td>
                      <td>Turutan #{b.susunan_turutan || idx + 1}</td>
                      <td>
                        {b.status_aktif ? (
                          <span className={styles.badgeOk}>Aktif Di TV</span>
                        ) : (
                          <span className={styles.badgeLow}>Ditutup</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setBilikDiedit(b);
                              setBukaModalBilik(true);
                            }}
                            className={styles.btnEdit}
                          >
                            <Edit size={12} /> Edit
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

      {/* ===================== TAB 6: SIARAN TICKER TV (CRUD) ===================== */}
      {tabAktif === 'ticker' && isSuper && (
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>Pengurusan Teks Siaran TV (Ticker)</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Kawal ayat-ayat suci, hadis ruqyah, makluman jadual, atau promosi klinik yang bergerak di skrin TV.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedTicker.length > 0 && (
                <button onClick={padamTickerPukal} disabled={memproses} className={styles.btnBulkDelete}>
                  <Trash2 size={15} /> Padam Terpilih ({selectedTicker.length})
                </button>
              )}
              <button
                onClick={() => {
                  setTickerDiedit({
                    id: '',
                    teks_arab: '',
                    teks_maksud: '',
                    rujukan: '',
                    kategori: 'ayat_syifa',
                    status_aktif: true,
                    turutan: senaraiTicker.length + 1
                  });
                  setBukaModalTicker(true);
                }}
                className={styles.btnAction}
              >
                <PlusCircle size={16} /> Tambah Mesej Ticker
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
                      checked={senaraiTicker.length > 0 && selectedTicker.length === senaraiTicker.length}
                      onChange={toggleSelectAllTicker}
                      title="Pilih Semua"
                    />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                  <th>Kategori</th>
                  <th>Teks Maksud / Pengumuman</th>
                  <th>Rujukan</th>
                  <th style={{ textAlign: 'center' }}>Status Siaran</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {senaraiTicker.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Tiada mesej ticker didaftarkan.</td></tr>
                ) : (
                  senaraiTicker.map((t, idx) => (
                    <tr key={t.id} style={{ backgroundColor: selectedTicker.includes(t.id) ? 'rgba(2, 132, 199, 0.1)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className={styles.tableCheckbox}
                          checked={selectedTicker.includes(t.id)}
                          onChange={() => toggleSelectTicker(t.id)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td>
                        <span className={styles.adminRoleBadge} style={{
                          backgroundColor: t.kategori === 'ayat_syifa' ? '#059669' : t.kategori === 'hadis' ? '#0284c7' : t.kategori === 'promosi' ? '#d97706' : '#64748b'
                        }}>
                          {t.kategori.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ maxWidth: '350px' }}>
                        <div style={{ color: '#f1f5f9', fontWeight: 500 }}>{t.teks_maksud}</div>
                        {t.teks_arab && <div style={{ fontSize: '0.85rem', color: '#34d399', direction: 'rtl', marginTop: '0.2rem' }}>{t.teks_arab}</div>}
                      </td>
                      <td>{t.rujukan || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => toggleStatusTicker(t)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: t.status_aktif ? '#34d399' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}
                        >
                          {t.status_aktif ? <CheckCircle size={16} /> : <XCircle size={16} />}
                          {t.status_aktif ? 'Aktif' : 'Nyahaktif'}
                        </button>
                      </td>
                      <td>
                        <div className={styles.actionGroup} style={{ justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setTickerDiedit(t);
                              setBukaModalTicker(true);
                            }}
                            className={styles.btnEdit}
                          >
                            <Edit size={12} /> Edit
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

      {/* ===================== TAB 7: LANTIKAN PENTADBIR ===================== */}
      {tabAktif === 'admin' && isSuper && (
        <div className={styles.cardPanel}>
          <div className={styles.tableHeaderActionRow}>
            <div>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>Pengurusan & Lantikan Pentadbir Sistem</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Kawal capaian peranan (Super Admin, Admin Pesakit, & Admin Kewangan/Inventori)</p>
            </div>
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
                    <input
                      type="checkbox"
                      className={styles.tableCheckbox}
                      checked={adminBolehDipadam.length > 0 && selectedAdmin.length === adminBolehDipadam.length}
                      onChange={toggleSelectAllAdmin}
                      title="Pilih Semua (Kecuali Anda Sendiri)"
                    />
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
                    <tr key={adm.id} style={{ backgroundColor: selectedAdmin.includes(adm.id) ? 'rgba(2, 132, 199, 0.1)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        {!sayaSendiri ? (
                          <input
                            type="checkbox"
                            className={styles.tableCheckbox}
                            checked={selectedAdmin.includes(adm.id)}
                            onChange={() => toggleSelectAdmin(adm.id)}
                          />
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Saya</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ color: '#f1f5f9' }}>{adm.nama}</td>
                      <td>{adm.email}</td>
                      <td>
                        <span className={styles.adminRoleBadge} style={{ 
                          backgroundColor: adm.peranan === 'super_admin' ? '#7c3aed' : adm.peranan === 'admin_pesakit' ? '#059669' : '#0284c7' 
                        }}>
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

      {/* MODAL 1: KEMASKINI MAKLUMAT & ALAMAT PESAKIT */}
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
                  <textarea
                    rows={3}
                    placeholder="cth: No. 12, Jalan Mawar 3, Seksyen 7, 40000 Shah Alam, Selangor"
                    className={styles.inputField}
                    style={{ resize: 'vertical' }}
                    value={pesakitDiedit.alamat || ''}
                    onChange={(e) => setPesakitDiedit({ ...pesakitDiedit, alamat: e.target.value })}
                  />
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

      {/* MODAL 2: GARIS MASA SEJARAH RAWATAN PESAKIT */}
      {pesakitGarisMasa && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Sejarah Rawatan: {pesakitGarisMasa.nama}</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  IC: {pesakitGarisMasa.no_ic} | Tel: {pesakitGarisMasa.no_telefon}
                </p>
                {pesakitGarisMasa.alamat && (
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#38bdf8' }}>
                    <MapPin size={12} style={{ display: 'inline' }} /> {pesakitGarisMasa.alamat}
                  </p>
                )}
              </div>
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
                      <span>{new Date(s.created_at).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <strong style={{ color: '#38bdf8' }}>{s.perawat?.nama} ({s.perawat?.no_bilik})</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#f1f5f9', marginBottom: '0.35rem' }}>
                      <strong>Dapatan / Reaksi:</strong> {Array.isArray(s.reaksi_rawatan) ? s.reaksi_rawatan.join(', ') : s.dapatan_gangguan}
                    </div>
                    {s.item_tambahan && (
                      <div style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                        Penawar Tambahan: {s.item_tambahan} (RM {Number(s.harga_tambahan).toFixed(2)})
                      </div>
                    )}
                    {s.perlu_mc && (
                      <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '0.2rem' }}>
                        ✓ Dikeluarkan Cuti Sakit ({s.tempoh_mc_hari} Hari) - "{s.sebab_mc}"
                      </div>
                    )}
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Nama Penuh (Beserta Gelaran):</label>
                  <input type="text" required placeholder="cth: Ustaz Dr. Amri Mahmud" className={styles.inputField} value={perawatDiedit.nama} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, nama: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>No. Bilik Rawatan:</label>
                  <input type="text" required placeholder="cth: Bilik 2" className={styles.inputField} value={perawatDiedit.no_bilik} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, no_bilik: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>No. Telefon:</label>
                  <input type="text" placeholder="012-3456789" className={styles.inputField} value={perawatDiedit.no_telefon || ''} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, no_telefon: e.target.value })} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Kelayakan / Sijil Tauliah:</label>
                  <input type="text" placeholder="cth: Sijil Rawatan Islam Darul Syifa (Kohort 2020)" className={styles.inputField} value={perawatDiedit.kelayakan || ''} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, kelayakan: e.target.value })} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Bidang Tumpuan / Kepakaran Ruqyah:</label>
                  <input type="text" placeholder="cth: Gangguan Sihir Rumah Tangga & Trauma Emosi" className={styles.inputField} value={perawatDiedit.bidang_khusus || ''} onChange={(e) => setPerawatDiedit({ ...perawatDiedit, bidang_khusus: e.target.value })} />
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

      {/* MODAL 4: KAWALAN BILIK RAWATAN */}
      {bukaModalBilik && bilikDiedit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{bilikDiedit.id && bilikDiedit.id !== 0 ? 'Kemaskini Bilik Rawatan' : 'Tambah Bilik Rawatan Baharu'}</h3>
              <button onClick={() => setBukaModalBilik(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpanBilik}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Nama Bilik (cth: Bilik 1, Bilik Rawatan Wanita):</label>
                  <input
                    type="text"
                    required
                    className={styles.inputField}
                    value={bilikDiedit.nama_bilik}
                    onChange={(e) => setBilikDiedit({ ...bilikDiedit, nama_bilik: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Lokasi / Sayap Fizikal:</label>
                  <input
                    type="text"
                    placeholder="cth: Aras Bawah / Berhampiran Pintu"
                    className={styles.inputField}
                    value={bilikDiedit.lokasi_fizikal || ''}
                    onChange={(e) => setBilikDiedit({ ...bilikDiedit, lokasi_fizikal: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Susunan Turutan:</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.inputField}
                    value={bilikDiedit.susunan_turutan || 1}
                    onChange={(e) => setBilikDiedit({ ...bilikDiedit, susunan_turutan: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    <input
                      type="checkbox"
                      checked={bilikDiedit.status_aktif}
                      onChange={(e) => setBilikDiedit({ ...bilikDiedit, status_aktif: e.target.checked })}
                      style={{ width: '1.2rem', height: '1.2rem', accentColor: '#0284c7' }}
                    />
                    Aktifkan Bilik Ini untuk Paparan Skrin TV
                  </label>
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

      {/* MODAL 5: SIARAN TICKER TV */}
      {bukaModalTicker && tickerDiedit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{tickerDiedit.id ? 'Kemaskini Siaran Ticker' : 'Tambah Siaran Ticker Baharu'}</h3>
              <button onClick={() => setBukaModalTicker(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={simpanTicker}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Kategori Teks:</label>
                  <select
                    className={styles.selectField}
                    value={tickerDiedit.kategori}
                    onChange={(e: any) => setTickerDiedit({ ...tickerDiedit, kategori: e.target.value })}
                  >
                    <option value="ayat_syifa">Ayat As-Syifa' (Al-Quran)</option>
                    <option value="hadis">Hadis Penawar</option>
                    <option value="makluman">Makluman Pentadbiran</option>
                    <option value="promosi">Promosi & Pakej Klinik</option>
                  </select>
                </div>

                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Teks Arab (Pilihan untuk Ayat / Doa):</label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="cth: وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ"
                    className={styles.inputField}
                    value={tickerDiedit.teks_arab || ''}
                    onChange={(e) => setTickerDiedit({ ...tickerDiedit, teks_arab: e.target.value })}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Teks Terjemahan / Pengumuman Penuh: *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="cth: Dan Kami turunkan dari Al-Quran suatu yang menjadi penawar..."
                    className={styles.inputField}
                    value={tickerDiedit.teks_maksud}
                    onChange={(e) => setTickerDiedit({ ...tickerDiedit, teks_maksud: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Rujukan / Sumber:</label>
                  <input
                    type="text"
                    placeholder="cth: Surah Al-Isra : 82 / Pihak Pengurusan"
                    className={styles.inputField}
                    value={tickerDiedit.rujukan || ''}
                    onChange={(e) => setTickerDiedit({ ...tickerDiedit, rujukan: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Turutan Siaran:</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.inputField}
                    value={tickerDiedit.turutan || 1}
                    onChange={(e) => setTickerDiedit({ ...tickerDiedit, turutan: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    <input
                      type="checkbox"
                      checked={tickerDiedit.status_aktif}
                      onChange={(e) => setTickerDiedit({ ...tickerDiedit, status_aktif: e.target.checked })}
                      style={{ width: '1.2rem', height: '1.2rem', accentColor: '#0284c7' }}
                    />
                    Siarkan Mesej Ini di Skrin TV Sekarang
                  </label>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setBukaModalTicker(false)} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction}><PlusCircle size={16} /> Simpan Siaran</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: LANTIKAN ADMIN BAHARU */}
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
                  <input type="text" required placeholder="cth: Siti Aminah" className={styles.inputField} value={adminNama} onChange={(e) => setAdminNama(e.target.value)} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>E-mel Log Masuk:</label>
                  <input type="email" required placeholder="siti@syifalink.com" className={styles.inputField} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Kata Laluan:</label>
                  <input type="password" required placeholder="••••••••" className={styles.inputField} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                </div>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Tugasan Peranan:</label>
                  <select className={styles.selectField} value={adminPeranan} onChange={(e: any) => setAdminPeranan(e.target.value)}>
                    <option value="admin_pesakit">Admin Data & Sejarah Pesakit (Akses data pesakit sahaja)</option>
                    <option value="admin_kewangan_inventori">Admin Kewangan & Inventori (Akses stok & tunai sahaja)</option>
                  </select>
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

      {/* MODAL 7: DAFTAR / EDIT INVENTORI */}
      {(bukaModalTambahBahan || itemDiedit) && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{itemDiedit ? 'Edit Item' : 'Daftar Item Baharu'}</h3>
              <button onClick={() => { setBukaModalTambahBahan(false); setItemDiedit(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={itemDiedit ? simpanKemaskiniItem : simpanItemBaharu}>
              <div className={styles.formGridModal}>
                <div className={styles.formGroupFull}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Nama Item:</label>
                  <input type="text" required className={styles.inputField} value={formNama} onChange={(e) => setFormNama(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Kategori:</label>
                  <select className={styles.selectField} value={formKategori} onChange={(e) => setFormKategori(e.target.value)}>
                    <option value="penawar">Penawar</option>
                    <option value="peralatan">Peralatan</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Harga Jualan (RM):</label>
                  <input type="number" step="0.01" required className={styles.inputField} value={formHarga} onChange={(e) => setFormHarga(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Baki Stok:</label>
                  <input type="number" className={styles.inputField} value={formStokAwal} onChange={(e) => setFormStokAwal(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Paras Amaran:</label>
                  <input type="number" className={styles.inputField} value={formTahapAmaran} onChange={(e) => setFormTahapAmaran(e.target.value)} />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => { setBukaModalTambahBahan(false); setItemDiedit(null); }} className={styles.btnCancel}>Batal</button>
                <button type="submit" disabled={memproses} className={styles.btnAction}><PlusCircle size={16} /> Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}