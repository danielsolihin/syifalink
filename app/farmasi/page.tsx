'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './farmasi.module.css';
import { PackageCheck, QrCode, Printer, FileText, Accessibility, Car, Check } from 'lucide-react';
import Link from 'next/link';

export default function KaunterFarmasi() {
  const [pesananList, setPesananList] = useState<any[]>([]);
  const [pesananBayaran, setPesananBayaran] = useState<any | null>(null);
  const [resitSelesai, setResitSelesai] = useState<any | null>(null);
  const [paparanMC, setPaparanMC] = useState<any | null>(null);
  const [memproses, setMemproses] = useState(false);

  // Senarai Amaran Bantuan Kerusi Roda Masa Nyata
  const [senaraiWheelchair, setSenaraiWheelchair] = useState<any[]>([]);

  // 1. Muat Turun Pesanan Farmasi
  const muatDataPesanan = async () => {
    const { data } = await supabase
      .from('pesanan_ubat')
      .select(`
        *,
        pesakit ( nama, no_ic ),
        sesi_rawatan (
          perlu_mc,
          tempoh_mc_hari,
          sebab_mc,
          perawat ( nama, no_bilik )
        )
      `)
      .eq('status_bayaran', 'belum_bayar')
      .order('created_at', { ascending: false });

    if (data) setPesananList(data);
  };

  // 2. Muat Permintaan Kerusi Roda yang Belum Dibantu
  const muatPermintaanWheelchair = async () => {
    const tarikhHariIni = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('giliran')
      .select('*, pesakit(nama, no_telefon, alamat)')
      .eq('perlu_kerusi_roda', true)
      .eq('status_kerusi_roda', 'menunggu_bantuan')
      .gte('created_at', `${tarikhHariIni}T00:00:00`)
      .order('created_at', { ascending: true });

    if (data) setSenaraiWheelchair(data);
  };

  // 3. Staf Sahkan Kerusi Roda Telah Dihantar ke Kereta
  const sahkanKerusiRodaDiserahkan = async (giliranId: string) => {
    await supabase
      .from('giliran')
      .update({ status_kerusi_roda: 'selesai_bantu' })
      .eq('id', giliranId);

    muatPermintaanWheelchair();
  };

  useEffect(() => {
    muatDataPesanan();
    muatPermintaanWheelchair();

    const saluran = supabase
      .channel('farmasi_wheelchair_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan_ubat' }, () => muatDataPesanan())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giliran' }, () => muatPermintaanWheelchair())
      .subscribe();

    return () => {
      supabase.removeChannel(saluran);
    };
  }, []);

  const tandakanSiapBungkus = async (id: string) => {
    await supabase.from('pesanan_ubat').update({ status_bungkusan: 'siap_bungkus' }).eq('id', id);
    setPesananList(prev => prev.map(item => item.id === id ? { ...item, status_bungkusan: 'siap_bungkus' } : item));
  };

  const selesaikanBayaran = async (kaedah: 'duitnow_qr' | 'tunai') => {
    if (!pesananBayaran) return;
    setMemproses(true);

    try {
      const tarikhKini = new Date();
      const tarikhFormat = tarikhKini.toISOString().split('T')[0];
      const nomborRawak = Math.floor(1000 + Math.random() * 9000);
      const noResitJana = `REC-${tarikhFormat.replace(/-/g, '')}-${nomborRawak}`;

      await supabase
        .from('pesanan_ubat')
        .update({ status_bayaran: 'telah_bayar', kaedah_bayaran: kaedah })
        .eq('id', pesananBayaran.id);

      await supabase.from('lejar_kewangan').insert({
        no_resit: noResitJana,
        jenis_transaksi: 'masuk',
        kategori: 'bayaran_rawatan',
        jumlah: pesananBayaran.jumlah_bayaran,
        kaedah_bayaran: kaedah,
        pesakit_id: pesananBayaran.pesakit_id,
        tarikh: tarikhFormat,
        catatan: `Bayaran rawatan & penawar (${pesananBayaran.pesakit?.nama || 'Pesakit'})`
      });

      if (pesananBayaran.senarai_item && pesananBayaran.senarai_item.length > 0) {
        for (const item of pesananBayaran.senarai_item) {
          if (item.item_id && item.item_id !== 'custom_item' && item.item_id !== 'sijil_mc') {
            const { data: dataBahan } = await supabase
              .from('bahan_penawar')
              .select('id, stok_semasa')
              .eq('id', item.item_id)
              .maybeSingle();

            if (dataBahan) {
              const bakiBaru = Math.max(0, (dataBahan.stok_semasa || 0) - (item.kuantiti || 1));
              await supabase.from('bahan_penawar').update({ stok_semasa: bakiBaru }).eq('id', item.item_id);
              await supabase.from('inventori_log').insert({
                bahan_id: item.item_id,
                jenis_pergerakan: 'keluar',
                kuantiti: item.kuantiti,
                baki_selepas: bakiBaru,
                catatan: `Jualan Kaunter (Resit: ${noResitJana})`
              });
            }
          }
        }
      }

      setResitSelesai({
        ...pesananBayaran,
        no_resit: noResitJana,
        kaedah_bayaran: kaedah,
        tarikh_masa: tarikhKini.toLocaleString('ms-MY')
      });

      setPesananList(prev => prev.filter(p => p.id !== pesananBayaran.id));
      setPesananBayaran(null);
    } catch (err: any) {
      alert('Ralat pengesahan bayaran: ' + err.message);
    } finally {
      setMemproses(false);
    }
  };

  const kiraTarikhTamatMC = (hari: number) => {
    const tarikh = new Date();
    tarikh.setDate(tarikh.getDate() + (hari - 1));
    return tarikh.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: '1rem' }} className={styles.noPrint}>
        <Link href="/" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Menu Utama
        </Link>
      </div>

      <header className={`${styles.header} ${styles.noPrint}`}>
        <div>
          <h1 className={styles.title}>
            <PackageCheck size={28} /> Kaunter Farmasi & Pembayaran
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            Pantau bungkusan penawar ruqyah, bantuan kerusi roda & kutipan bayaran
          </p>
        </div>
        <div className={styles.badgeLive}>
          Pesanan Menunggu: {pesananList.length}
        </div>
      </header>

      {/* SEPANDUK AMARAN KELUAR MASUK KERUSI RODA */}
      {senaraiWheelchair.length > 0 && (
        <div className={styles.noPrint} style={{
          backgroundColor: '#451a03',
          border: '2px solid #f59e0b',
          borderRadius: '0.85rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fef08a', fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem' }}>
            <Accessibility size={22} color="#f59e0b" />
            <span>PERMINTAAN KERUSI RODA DI KAWASAN DROP-OFF / PARKIR ({senaraiWheelchair.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {senaraiWheelchair.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#291203',
                border: '1px solid #78350f',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                    {item.no_giliran} - {item.pesakit?.nama}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#fef3c7', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span>Tel: <strong>{item.pesakit?.no_telefon}</strong></span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Car size={14} color="#f59e0b" /> Kenderaan: <strong>{item.no_plat_kereta || 'Sila Hubungi'}</strong>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => sahkanKerusiRodaDiserahkan(item.id)}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#022c22',
                    border: 'none',
                    borderRadius: '0.4rem',
                    padding: '0.55rem 0.95rem',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Check size={16} /> Kerusi Roda Diserahkan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Senarai Pesanan Farmasi */}
      {pesananList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }} className={styles.noPrint}>
          <p style={{ fontSize: '1.1rem' }}>Tiada pesanan penawar aktif buat masa ini.</p>
        </div>
      ) : (
        <div className={`${styles.gridOrders} ${styles.noPrint}`}>
          {pesananList.map((order) => {
            const siapBungkus = order.status_bungkusan === 'siap_bungkus';
            const adaMC = order.sesi_rawatan?.perlu_mc || order.senarai_item?.some((it: any) => it.item_id === 'sijil_mc');

            return (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.patientName}>{order.pesakit?.nama || 'Pesakit'}</h3>
                    <p className={styles.patientIC}>IC: {order.pesakit?.no_ic}</p>
                  </div>
                  <span className={`${styles.tagBungkus} ${siapBungkus ? styles.tagHijau : styles.tagKuning}`}>
                    {siapBungkus ? 'Siap Dibungkus' : 'Perlu Dibungkus'}
                  </span>
                </div>

                <div className={styles.itemList}>
                  {order.senarai_item?.map((item: any, idx: number) => (
                    <div key={idx} className={styles.itemRow}>
                      <span>{item.kuantiti}x {item.nama}</span>
                      <span style={{ fontWeight: 600, color: item.harga_seunit === 0 ? '#34d399' : '#38bdf8' }}>
                        {item.harga_seunit === 0 ? 'PERCUMA' : `RM ${(item.harga_seunit * item.kuantiti).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>

                {adaMC && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaparanMC(order)}
                      className={styles.btnMC}
                      style={{ width: '100%' }}
                    >
                      <FileText size={16} /> Cetak Sijil Perakuan Cuti Sakit (MC)
                    </button>
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Jumlah Perlu Dibayar:</span>
                    <span className={styles.totalAmount}>RM {order.jumlah_bayaran?.toFixed(2)}</span>
                  </div>

                  <div className={styles.actions}>
                    {!siapBungkus ? (
                      <button onClick={() => tandakanSiapBungkus(order.id)} className={styles.btnPack}>
                        Tanda Siap Bungkus
                      </button>
                    ) : (
                      <button onClick={() => setPesananBayaran(order)} className={styles.btnPay}>
                        Kutip Bayaran
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: SIJIL MC */}
      {paparanMC && (
        <div className={styles.mcOverlay}>
          <div className={styles.mcDocument}>
            <div className={styles.mcHeader}>
              <h2 className={styles.mcClinicTitle}>Pusat Rawatan Islam Darul Syifa'</h2>
              <p className={styles.mcClinicSub}>Klinik Perubatan Islam & Ruqyah Syar'iyyah | Berdaftar & Diiktiraf</p>
              <p className={styles.mcClinicSub} style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                No. Perakuan Pendaftaran: DS-SEL-2026/0914
              </p>
            </div>

            <div className={styles.mcDocTitle}>SIJIL PERAKUAN RAWATAN & CUTI REHAT</div>

            <p style={{ textAlign: 'right', fontSize: '0.85rem', fontFamily: 'sans-serif', margin: '0.5rem 0 1rem 0' }}>
              Tarikh: <strong>{new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </p>

            <div className={styles.mcBodyText}>
              Dengan ini diperakui bahawa penama di bawah:
              <br /><br />
              Nama Pesakit : <span className={styles.mcHighlight}>{paparanMC.pesakit?.nama}</span>
              <br />
              No. Kad Pengenalan : <span className={styles.mcHighlight}>{paparanMC.pesakit?.no_ic}</span>
              <br /><br />
              Telah hadir menjalani sesi rawatan terapi ruqyah syar'iyyah intensif di pusat rawatan kami pada tarikh di atas.
              <br /><br />
              Dapatan Klinikal / Sebab Rehat:
              <br />
              <span className={styles.mcHighlight} style={{ fontStyle: 'italic', display: 'inline-block', marginTop: '0.25rem' }}>
                "{paparanMC.sesi_rawatan?.sebab_mc || 'Kelesuan fizikal melampau kesan reaksi rawatan ruqyah'}"
              </span>
              <br /><br />
              Atas nasihat perawat, beliau diberikan cuti rehat selama{' '}
              <span className={styles.mcHighlight}>{paparanMC.sesi_rawatan?.tempoh_mc_hari || 1} Hari</span> bermula pada{' '}
              <strong>{new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> sehingga{' '}
              <strong>{kiraTarikhTamatMC(paparanMC.sesi_rawatan?.tempoh_mc_hari || 1)}</strong> bagi tujuan pemulihan afiah di rumah.
            </div>

            <div className={styles.mcSignatureGrid}>
              <div className={styles.mcSignatureBox}>
                <div style={{ height: '50px' }}></div>
                <div className={styles.mcSignatureLine}></div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  {paparanMC.sesi_rawatan?.perawat?.nama || 'Ustaz Perawat Bertugas'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Perawat Bertauliah Darul Syifa'</div>
              </div>

              <div className={styles.mcSignatureBox}>
                <div style={{
                  border: '2px dashed #94a3b8',
                  borderRadius: '50%',
                  width: '90px',
                  height: '90px',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transform: 'rotate(-10deg)'
                }}>
                  COP RASMI
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Klinik Darul Syifa'</div>
              </div>
            </div>

            <div className={styles.noPrint} style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => window.print()} className={styles.btnPrintReceipt}>
                <Printer size={16} /> Cetak Sijil MC (A4 / A5)
              </button>
              <button
                type="button"
                onClick={() => setPaparanMC(null)}
                style={{ flex: 1, backgroundColor: '#334155', color: '#ffffff', border: 'none', borderRadius: '0.5rem', padding: '0.75rem', cursor: 'pointer', fontWeight: 600, marginTop: '0.75rem' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BAYARAN */}
      {pesananBayaran && (
        <div className={`${styles.modalOverlay} ${styles.noPrint}`}>
          <div className={styles.modalContent}>
            <h2 style={{ fontSize: '1.25rem', color: '#34d399', margin: '0 0 0.5rem 0' }}>Penerimaan Bayaran</h2>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0 }}>
              Pesakit: <strong>{pesananBayaran.pesakit?.nama}</strong>
            </p>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: '0.5rem 0' }}>
              RM {pesananBayaran.jumlah_bayaran?.toFixed(2)}
            </div>

            <div className={styles.qrPlaceholder}>
              <QrCode size={110} color="#0f172a" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem', color: '#047857' }}>DuitNow QR Dinamik</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button disabled={memproses} onClick={() => selesaikanBayaran('duitnow_qr')} style={{ backgroundColor: '#10b981', color: '#022c22', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                Sah DuitNow (Lulus)
              </button>
              <button disabled={memproses} onClick={() => selesaikanBayaran('tunai')} style={{ backgroundColor: '#334155', color: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Bayar Tunai
              </button>
              <button onClick={() => setPesananBayaran(null)} style={{ background: 'none', color: '#94a3b8', border: 'none', padding: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESIT SELESAI */}
      {resitSelesai && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.printReceiptArea}`}>
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', fontWeight: 800 }}>DARUL SYIFA'</h3>
              <p style={{ margin: 0, fontSize: '0.75rem' }}>Pusat Rawatan Islam</p>
              <p style={{ margin: 0, fontSize: '0.7rem' }}>--------------------------------</p>
              <p style={{ margin: '0.2rem 0', fontSize: '0.75rem' }}>RESIT RASMI PEMBAYARAN</p>
              <p style={{ margin: 0, fontSize: '0.7rem' }}>--------------------------------</p>
            </div>

            <div style={{ textAlign: 'left', fontSize: '0.8rem', lineHeight: '1.4' }}>
              <div>Pesakit : {resitSelesai.pesakit?.nama}</div>
              <div>No. IC  : {resitSelesai.pesakit?.no_ic}</div>
              <div>Masa    : {resitSelesai.tarikh_masa}</div>
              <div>Kaedah  : {resitSelesai.kaedah_bayaran === 'duitnow_qr' ? 'DuitNow QR' : 'Tunai'}</div>
              <div style={{ margin: '0.4rem 0', borderBottom: '1px dashed #cbd5e1' }}></div>
              <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>SENARAI PENAWAR:</div>
              {resitSelesai.senarai_item?.map((it: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span>{it.kuantiti}x {it.nama}</span>
                  <span>{it.harga_seunit === 0 ? 'PERCUMA' : `RM ${(it.harga_seunit * it.kuantiti).toFixed(2)}`}</span>
                </div>
              ))}
              <div style={{ margin: '0.4rem 0', borderBottom: '1px dashed #cbd5e1' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                <span>JUMLAH BESAR:</span>
                <span>RM {resitSelesai.jumlah_bayaran?.toFixed(2)}</span>
              </div>
            </div>

            <div className={styles.noPrint} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => window.print()} className={styles.btnPrintReceipt}>
                <Printer size={16} /> Cetak Resit
              </button>
              <button onClick={() => setResitSelesai(null)} style={{ flex: 1, backgroundColor: '#334155', color: '#ffffff', border: 'none', borderRadius: '0.5rem', padding: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}