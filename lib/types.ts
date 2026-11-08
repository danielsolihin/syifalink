export interface Pesakit {
  id: string;
  no_ic: string;
  nama: string;
  no_telefon: string;
  alamat?: string;
  created_at?: string;
}

export interface Perawat {
  id: string;
  nama: string;
  no_bilik: string;
  status_tugas: 'tersedia' | 'merawat' | 'rehat' | 'offline';
  created_at?: string;
}

export interface ItemPenawar {
  item_id: string;
  nama: string;
  kuantiti: number;
  harga_seunit: number;
}

export interface Giliran {
  id: string;
  tarikh: string;
  no_giliran: string;
  pesakit_id: string;
  perawat_id?: string;
  tahap_kes: 'biasa' | 'histeria_kecemasan';
  status: 'menunggu' | 'dipanggil' | 'sedang_rawat' | 'ke_farmasi' | 'selesai';
  created_at?: string;
  waktu_selesai?: string;
}