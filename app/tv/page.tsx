// app/tv/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './tv.module.css';
import { Volume2, Users, Stethoscope, CloudSun, Bell, FileText, ArrowRight, X } from 'lucide-react';

interface InfoPanggilan {
  id: string;
  noGiliran: string;
  namaPesakit: string;
  bilik: string;
  namaPerawat: string;
  perluKerusiRoda?: boolean;
}

interface ItemTicker {
  id?: string;
  teks_arab?: string | null;
  teks_maksud: string;
  rujukan?: string | null;
  kategori?: string;
}

export default function SkrinTVDewan() {
  const [masaSekarang, setMasaSekarang] = useState<string>('');
  const [tarikhSekarang, setTarikhSekarang] = useState<string>('');
  const [audioDibenarkan, setAudioDibenarkan] = useState<boolean>(false);
  const [isSkrinPenuh, setIsSkrinPenuh] = useState<boolean>(false);

  // Cuaca & Waktu Solat
  const [suhuCuaca, setSuhuCuaca] = useState<string>('26°C');
  const [statusCuaca, setStatusCuaca] = useState<string>('Mendung');
  const [jadualSolat, setJadualSolat] = useState<{ [key: string]: string }>({
    Subuh: '05:48',
    Zohor: '13:00',
    Asar: '16:20',
    Maghrib: '18:58',
    Isyak: '20:09'
  });
  const [solatAktif, setSolatAktif] = useState<string>('Maghrib');

  // Panggilan & Senarai Bilik
  const [panggilanTerkini, setPanggilanTerkini] = useState<InfoPanggilan | null>(null);
  const [semuaBilikStatus, setSemuaBilikStatus] = useState<any[]>([]);
  const [halamanBilik, setHalamanBilik] = useState<number>(0);
  const [senaraiMenunggu, setSenaraiMenunggu] = useState<any[]>([]);

  // Ticker Siaran & Makluman Tetap
  const [senaraiTicker, setSenaraiTicker] = useState<ItemTicker[]>([]);
  const [maklumanTetap, setMaklumanTetap] = useState<{ tajuk: string; huraian: string }[]>([
    {
      tajuk: 'Pihak Pengurusan',
      huraian: 'Selamat Datang ke Pusat Rawatan Islam Darul Syifa\'. Sila patuhi adab dewan menunggu.'
    },
    {
      tajuk: 'Kaunter Pembayaran & Farmasi',
      huraian: 'Para pelanggan diminta menyerahkan slip giliran ke kaunter farmasi selepas selesai sesi rawatan.'
    }
  ]);

  const panggilanTerkiniRef = useRef<string | null>(null);
  const audioChimeRef = useRef<HTMLAudioElement | null>(null);
  const audioTtsRef = useRef<HTMLAudioElement | null>(null);

  // Helper Pemformat Waktu Solat
  const formatMasaSolat = (waktu: any): string => {
    if (!waktu) return '--:--';
    if (typeof waktu === 'number' || (!isNaN(Number(waktu)) && String(waktu).length >= 10)) {
      const d = new Date(Number(waktu) * 1000);
      return d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return String(waktu);
  };

  // Enjin Pengiraan Solat Aktif
  const kiraSolatAktif = (jadual: { [key: string]: string }) => {
    try {
      const kini = new Date();
      const minitSemasa = kini.getHours() * 60 + kini.getMinutes();

      const tukarKeMinit = (masaStr: string) => {
        if (!masaStr || !masaStr.includes(':')) return 0;
        const [j, m] = masaStr.split(':').map(Number);
        return j * 60 + m;
      };

      const mSubuh = tukarKeMinit(jadual.Subuh);
      const mZohor = tukarKeMinit(jadual.Zohor);
      const mAsar = tukarKeMinit(jadual.Asar);
      const mMaghrib = tukarKeMinit(jadual.Maghrib);
      const mIsyak = tukarKeMinit(jadual.Isyak);

      if (minitSemasa >= mIsyak || minitSemasa < mSubuh) {
        setSolatAktif('Isyak');
      } else if (minitSemasa >= mMaghrib) {
        setSolatAktif('Maghrib');
      } else if (minitSemasa >= mAsar) {
        setSolatAktif('Asar');
      } else if (minitSemasa >= mZohor) {
        setSolatAktif('Zohor');
      } else if (minitSemasa >= mSubuh) {
        setSolatAktif('Subuh');
      }
    } catch (e) {}
  };

  // 1. Pengurusan Skrin Penuh & Buka Kunci Audio Android TV
  const aktifkanSkrinPenuhDanAudio = () => {
    setAudioDibenarkan(true);

    // Buka kunci Chime
    if (audioChimeRef.current) {
      audioChimeRef.current.play().then(() => {
        if (audioChimeRef.current) {
          audioChimeRef.current.pause();
          audioChimeRef.current.currentTime = 0;
        }
      }).catch((err) => console.log('Izin chime TV:', err));
    }

    // Buka kunci saluran audio TTS serentak supaya tidak disekat Android TV
    if (audioTtsRef.current) {
      audioTtsRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      audioTtsRef.current.play().then(() => {
        if (audioTtsRef.current) {
          audioTtsRef.current.pause();
          audioTtsRef.current.currentTime = 0;
        }
      }).catch(() => {});
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsSkrinPenuh(true);
      }).catch((err) => {
        console.log('Kebenaran skrin penuh diperlukan:', err);
      });
    }
  };

  const keluarSkrinPenuh = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setIsSkrinPenuh(false);
      }).catch((err) => console.log(err));
    }
  };

  useEffect(() => {
    const semakPerubahanFullscreen = () => {
      setIsSkrinPenuh(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', semakPerubahanFullscreen);
    return () => document.removeEventListener('fullscreenchange', semakPerubahanFullscreen);
  }, []);

  // 2. Jam Digital
  useEffect(() => {
    const kemaskiniWaktu = () => {
      const kini = new Date();
      setMasaSekarang(kini.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }));
      setTarikhSekarang(kini.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
      kiraSolatAktif(jadualSolat);
    };
    kemaskiniWaktu();
    const pemasa = setInterval(kemaskiniWaktu, 1000);
    return () => clearInterval(pemasa);
  }, [jadualSolat]);

  // 3. Cuaca Live
  useEffect(() => {
    const ambilCuaca = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=3.0738&longitude=101.5183&current_weather=true');
        const data = await res.json();
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          setSuhuCuaca(`${temp}°C`);
          const code = data.current_weather.weathercode;
          if (code === 0) setStatusCuaca('Cerah');
          else if (code <= 3) setStatusCuaca('Mendung');
          else if (code >= 51 && code <= 67) setStatusCuaca('Hujan Ringan');
          else if (code >= 80) setStatusCuaca('Hujan');
          else setStatusCuaca('Redup');
        }
      } catch (e) {}
    };
    ambilCuaca();
    const pemasaCuaca = setInterval(ambilCuaca, 600000);
    return () => clearInterval(pemasaCuaca);
  }, []);

  // 4. Waktu Solat JAKIM
  useEffect(() => {
    const ambilWaktuSolat = async () => {
      try {
        const res = await fetch('https://api.waktusolat.app/v2/solat/SGR01');
        const data = await res.json();
        if (data && data.prayers && data.prayers.length > 0) {
          const p = data.prayers[0];
          const jadualBaru = {
            Subuh: formatMasaSolat(p.fajr),
            Zohor: formatMasaSolat(p.dhuhr),
            Asar: formatMasaSolat(p.asr),
            Maghrib: formatMasaSolat(p.maghrib),
            Isyak: formatMasaSolat(p.isha)
          };
          setJadualSolat(jadualBaru);
          kiraSolatAktif(jadualBaru);
        }
      } catch (e) {}
    };
    ambilWaktuSolat();
  }, []);

  // 5. Muat Data Ticker & Makluman Tetap
  const muatDataPengumuman = async () => {
    try {
      const { data } = await supabase
        .from('pengumuman_ticker')
        .select('*')
        .eq('status_aktif', true)
        .order('turutan', { ascending: true });

      if (data && data.length > 0) {
        setSenaraiTicker(data);

        const maklumanKhas = data.filter((d: any) => d.kategori === 'makluman');
        if (maklumanKhas.length >= 2) {
          setMaklumanTetap([
            {
              tajuk: maklumanKhas[0].rujukan || 'Pihak Pengurusan',
              huraian: maklumanKhas[0].teks_maksud
            },
            {
              tajuk: maklumanKhas[1].rujukan || 'Kaunter Pembayaran & Farmasi',
              huraian: maklumanKhas[1].teks_maksud
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Ralat muat pengumuman:', err);
    }
  };

  // 6. Audio & Suara Panggilan (Rantaian Automatik Kalis Android TV)
  const janaTeksSebutanMelayu = (noGiliran: string, bilik: string, namaPerawat: string) => {
    const abjad = noGiliran.charAt(0);
    const nomborBahagian = noGiliran.substring(2);

    const sebutanDigit: { [key: string]: string } = {
      '0': 'kosong',
      '1': 'satu',
      '2': 'dua',
      '3': 'tiga',
      '4': 'empat',
      '5': 'lima',
      '6': 'enam',
      '7': 'tujuh',
      '8': 'lapan',
      '9': 'sembilan'
    };

    const digitDieja = nomborBahagian
      .split('')
      .map(digit => sebutanDigit[digit] || digit)
      .join(' ');

    return `Nombor giliran, ${abjad} ${digitDieja}. Sila masuk ke ${bilik}.`;
  };

  const mainkanAudioPertuturan = (ayat: string) => {
    const encoded = encodeURIComponent(ayat);
    const urlGoogleTTS = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ms&client=tw-ob&q=${encoded}`;
    const urlApiTempatan = `/api/tts?text=${encoded}`;

    if (audioTtsRef.current) {
      audioTtsRef.current.src = urlApiTempatan;
      audioTtsRef.current.play().catch(() => {
        if (audioTtsRef.current) {
          audioTtsRef.current.src = urlGoogleTTS;
          audioTtsRef.current.play().catch(() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utter = new SpeechSynthesisUtterance(ayat);
              utter.lang = 'ms-MY';
              utter.rate = 0.9;
              window.speechSynthesis.speak(utter);
            }
          });
        }
      });
    }
  };

  const panggilSuara = async (noGiliran: string, bilik: string, namaPerawat: string) => {
    const ayatSebutan = janaTeksSebutanMelayu(noGiliran, bilik, namaPerawat);

    if (audioChimeRef.current) {
      audioChimeRef.current.currentTime = 0;
      audioChimeRef.current.onended = () => {
        mainkanAudioPertuturan(ayatSebutan);
      };
      audioChimeRef.current.play().catch((err) => {
        console.log('Ralat chime TV:', err);
        mainkanAudioPertuturan(ayatSebutan);
      });
    } else {
      mainkanAudioPertuturan(ayatSebutan);
    }
  };

  // 7. Muat Data Skrin & Status Bilik Masa Nyata
  const muatDataSkrin = async () => {
    try {
      const tarikhHariIni = new Date().toISOString().split('T')[0];

      // A. Ambil Maklumat Bilik Rawatan & Tabib Bertugas
      const { data: bilikData } = await supabase
        .from('bilik_rawatan')
        .select('*, perawat(id, nama, no_bilik)')
        .eq('status_aktif', true)
        .order('susunan_turutan', { ascending: true })
        .order('id', { ascending: true });

      const { data: semuaPerawat } = await supabase
        .from('perawat')
        .select('*')
        .eq('status_aktif', true);

      // B. Ambil Giliran Aktif
      const { data: giliranAktif } = await supabase
        .from('giliran')
        .select('id, no_giliran, status, perawat_id, perlu_kerusi_roda, created_at, pesakit(nama), perawat(id, nama, no_bilik)')
        .in('status', ['dipanggil', 'sedang_rawat', 'rawatan'])
        .gte('created_at', `${tarikhHariIni}T00:00:00`)
        .order('created_at', { ascending: false });

      if (giliranAktif && giliranAktif.length > 0 && bilikData) {
        const sedangDipanggil = giliranAktif.filter(g => g.status === 'dipanggil');
        const sedangRawat = giliranAktif.filter(g => g.status === 'sedang_rawat' || g.status === 'rawatan');
        const palingKini = sedangDipanggil.length > 0 ? sedangDipanggil[0] : sedangRawat[0];

        const tokenPanggilan = `${palingKini.id}_${palingKini.status}`;

        if (tokenPanggilan !== panggilanTerkiniRef.current) {
          panggilanTerkiniRef.current = tokenPanggilan;

          const perawatObj = palingKini.perawat as any;
          const bilikUstaz = bilikData.find(b => 
            (b.perawat_semasa_id && String(b.perawat_semasa_id) === String(palingKini.perawat_id)) ||
            (b.perawat?.id && String(b.perawat.id) === String(palingKini.perawat_id)) ||
            (perawatObj?.no_bilik && b.nama_bilik.toLowerCase().trim() === perawatObj.no_bilik.toLowerCase().trim())
          );

          const infoPanggilan: InfoPanggilan = {
            id: palingKini.id,
            noGiliran: palingKini.no_giliran,
            namaPesakit: (palingKini.pesakit as any)?.nama || 'Pesakit',
            bilik: bilikUstaz ? bilikUstaz.nama_bilik : (perawatObj?.no_bilik || 'Bilik Rawatan'),
            namaPerawat: perawatObj?.nama || 'Tabib Bertugas',
            perluKerusiRoda: Boolean((palingKini as any)?.perlu_kerusi_roda)
          };

          setPanggilanTerkini(infoPanggilan);
          panggilSuara(infoPanggilan.noGiliran, infoPanggilan.bilik, infoPanggilan.namaPerawat);
        }
      } else {
        setPanggilanTerkini(null);
        panggilanTerkiniRef.current = null;
      }

      // C. Padankan Status Bilik Rawatan
      if (bilikData) {
        const bilikKemaskini = bilikData.map((b) => {
          const perawatBilik = b.perawat || semuaPerawat?.find(p => 
            (b.perawat_semasa_id && String(p.id) === String(b.perawat_semasa_id)) ||
            (p.no_bilik && p.no_bilik.toLowerCase().trim() === b.nama_bilik.toLowerCase().trim())
          );
          const namaPerawat = perawatBilik?.nama || null;

          const rawatanBilik = giliranAktif?.find((g: any) => {
            const pObj = g.perawat as any;
            return (
              (b.perawat_semasa_id && String(g.perawat_id) === String(b.perawat_semasa_id)) ||
              (perawatBilik?.id && String(g.perawat_id) === String(perawatBilik.id)) ||
              (pObj?.no_bilik && pObj.no_bilik.toLowerCase().trim() === b.nama_bilik.toLowerCase().trim())
            );
          });

          return {
            id: b.id,
            namaBilik: b.nama_bilik,
            ustazNama: namaPerawat,
            sedangMerawat: Boolean(rawatanBilik),
            statusRawatan: rawatanBilik ? rawatanBilik.status : null,
            noGiliranAktif: rawatanBilik ? rawatanBilik.no_giliran : null,
            statusBilik: b.status
          };
        });

        setSemuaBilikStatus(bilikKemaskini);
      }

      // D. Ambil Giliran Menunggu
      const { data: menungguData } = await supabase
        .from('giliran')
        .select('no_giliran')
        .eq('status', 'menunggu')
        .gte('created_at', `${tarikhHariIni}T00:00:00`)
        .order('created_at', { ascending: true })
        .limit(6);

      setSenaraiMenunggu(menungguData || []);

    } catch (err) {
      console.error('Ralat kemaskini TV:', err);
    }
  };

  useEffect(() => {
    muatDataSkrin();
    muatDataPengumuman();
    const intervalPoll = setInterval(muatDataSkrin, 2500);

    const saluran = supabase
      .channel('tv_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giliran' }, () => muatDataSkrin())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bilik_rawatan' }, () => muatDataSkrin())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perawat' }, () => muatDataSkrin())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman_ticker' }, () => muatDataPengumuman())
      .subscribe();

    return () => {
      clearInterval(intervalPoll);
      supabase.removeChannel(saluran);
    };
  }, []);

  // 8. Penggiliran Paparan Bilik
  const jumlahHalaman = Math.max(1, Math.ceil(semuaBilikStatus.length / 4));

  useEffect(() => {
    if (semuaBilikStatus.length <= 4) {
      setHalamanBilik(0);
      return;
    }

    const timerCarousel = setInterval(() => {
      setHalamanBilik(prev => (prev + 1) % jumlahHalaman);
    }, 12000);

    return () => clearInterval(timerCarousel);
  }, [semuaBilikStatus.length, jumlahHalaman]);

  const bilikDipaparkan = semuaBilikStatus.slice(halamanBilik * 4, (halamanBilik + 1) * 4);

  return (
    <div
      className={styles.tvContainer}
      onClick={() => {
        if (!audioDibenarkan) {
          aktifkanSkrinPenuhDanAudio();
        }
      }}
    >
      <audio ref={audioChimeRef} src="/sounds/chime.mp3" preload="auto" />
      <audio ref={audioTtsRef} preload="auto" />

      {/* Butang Keluar Skrin Penuh */}
      <div className={styles.exitZone}>
        <button
          onClick={keluarSkrinPenuh}
          className={styles.btnExitFullscreen}
          title="Keluar dari Mod Skrin Penuh"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className={styles.contentWrapper}>
        {!audioDibenarkan && (
          <div className={styles.audioBanner}>
            <span>Sila klik butang di sebelah untuk membenarkan loceng dan suara panggilan TV dewan.</span>
            <button
              onClick={aktifkanSkrinPenuhDanAudio}
              className={styles.btnEnableAudio}
            >
              Aktifkan Suara Panggilan & Skrin Penuh
            </button>
          </div>
        )}

        {/* Pengepala Atas */}
        <header className={styles.topBar}>
          <div className={styles.clinicBrand}>
            <img src="/logo.png" alt="SyifaLink" className={styles.logoImage} />
            <div>
              <span className={styles.welcomeText}>Selamat Datang ke</span>
              <h1 className={styles.clinicTitleText}>Pusat Rawatan Islam Darul Syifa'</h1>
            </div>
          </div>

          <div className={styles.islamicInfoBar}>
            <div className={styles.weatherWidget}>
              <CloudSun size={20} />
              <span>{suhuCuaca} ({statusCuaca})</span>
            </div>

            <div className={styles.prayerTimesStrip}>
              {Object.entries(jadualSolat).map(([namaSolat, waktu]) => (
                <div
                  key={namaSolat}
                  className={`${styles.prayerItem} ${solatAktif === namaSolat ? styles.prayerActive : ''}`}
                >
                  <span className={styles.prayerName}>{namaSolat}</span>
                  <span className={styles.prayerTime}>{formatMasaSolat(waktu)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.clockArea}>
            <div className={styles.digitalTime}>{masaSekarang}</div>
            <div className={styles.digitalDate}>{tarikhSekarang}</div>
          </div>
        </header>

        {/* Susun Atur Utama */}
        <div className={styles.mainLayout}>
          {/* BARIS 1 KIRI: SEDANG DIPANGGIL */}
          <section className={styles.nowSeeingCard}>
            <div className={styles.nowSeeingHeader}>
              <span className={styles.nowSeeingTitle}>SEDANG DIPANGGIL</span>
              <span className={styles.nowSeeingSubtitle}>NOMBOR GILIRAN</span>
            </div>

            {panggilanTerkini ? (
              <>
                <div className={styles.activeNumber}>
                  {panggilanTerkini.noGiliran}
                  {panggilanTerkini.perluKerusiRoda && (
                    <span className={styles.wheelchairIcon} title="Pesakit Memerlukan Kerusi Roda">♿</span>
                  )}
                </div>

                <div className={styles.patientName}>{panggilanTerkini.namaPesakit}</div>

                <div className={styles.proceedBox}>
                  <div className={styles.proceedLabel}>Sila Masuk Ke</div>
                  <div className={styles.roomDestinationRow}>
                    <span className={styles.roomDestination}>{panggilanTerkini.bilik}</span>
                    <div className={styles.arrowCircle}>
                      <ArrowRight size={26} strokeWidth={4} />
                    </div>
                  </div>
                  <div className={styles.perawatName}>Bersama {panggilanTerkini.namaPerawat}</div>
                </div>
              </>
            ) : (
              <div className={styles.emptyCallContent}>
                <Volume2 size={54} style={{ opacity: 0.6, marginBottom: '0.6rem' }} />
                <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Sila nantikan nombor anda diumumkan
                </p>
              </div>
            )}
          </section>

          {/* BARIS 1 KANAN: STATUS 4 BILIK RAWATAN */}
          <section className={styles.doctorStatusCard}>
            <div className={styles.doctorStatusHeader}>
              <span className={styles.doctorStatusTitle}>
                <Stethoscope size={20} /> STATUS BILIK RAWATAN
              </span>
              {semuaBilikStatus.length > 4 && (
                <span className={styles.pageIndicatorPill}>
                  Paparan {halamanBilik + 1} / {jumlahHalaman}
                </span>
              )}
            </div>

            <div className={styles.doctorStatusList}>
              {bilikDipaparkan.map((b) => {
                const adaUstaz = Boolean(b.ustazNama);
                const sedangAktif = Boolean(b.sedangMerawat);

                return (
                  <div
                    key={b.id}
                    className={`${styles.roomRow} ${sedangAktif ? styles.roomRowBusy : ''}`}
                  >
                    <div className={styles.roomDoctorCol}>
                      <div className={styles.roomLabelTitle}>{b.namaBilik}</div>
                      <div className={styles.roomDoctorName}>
                        {adaUstaz ? b.ustazNama : <span className={styles.rehatText}>Rehat / Kosong</span>}
                      </div>
                    </div>

                    <div className={styles.roomStatusCol}>
                      {sedangAktif ? (
                        <span className={styles.statusSeeing}>
                          <span className={styles.pulseDot}></span>
                          {b.statusRawatan === 'dipanggil' ? 'Sedang Dipanggil' : 'Sedang Merawat'} (<strong>{b.noGiliranAktif}</strong>)
                        </span>
                      ) : adaUstaz ? (
                        <span className={styles.statusAvailable}>
                          Sedia Menerima Pesakit
                        </span>
                      ) : (
                        <span className={styles.statusClosed}>
                          Bilik Tidak Beroperasi
                        </span>
                      )}
                    </div>

                    <div className={styles.roomWaitCol}>
                      {sedangAktif ? (
                        <div className={styles.badgeBusyPill}>Aktif</div>
                      ) : adaUstaz ? (
                        <div className={styles.badgeAvailablePill}>Tersedia</div>
                      ) : (
                        <div className={styles.badgeClosedPill}>Tutup</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* BARIS 2 KIRI: MAKLUMAN TETAP */}
          <div className={styles.fixedNoticeCard}>
            <div className={styles.noticeItemRow}>
              <div className={styles.roundIconTeal}>
                <Bell size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className={styles.noticeContentTitle}>{maklumanTetap[0]?.tajuk}</div>
                <p className={styles.noticeContentDesc}>{maklumanTetap[0]?.huraian}</p>
              </div>
            </div>

            <div className={styles.noticeDivider}></div>

            <div className={styles.noticeItemRow}>
              <div className={styles.roundIconTeal}>
                <FileText size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className={styles.noticeContentTitle}>{maklumanTetap[1]?.tajuk}</div>
                <p className={styles.noticeContentDesc}>{maklumanTetap[1]?.huraian}</p>
              </div>
            </div>
          </div>

          {/* BARIS 2 KANAN: GILIRAN MENUNGGU SETERUSNYA */}
          <div className={styles.waitingBoxCard}>
            <div className={styles.waitingHeaderRow}>
              <Users size={20} />
              <span>GILIRAN MENUNGGU SETERUSNYA</span>
            </div>

            {senaraiMenunggu.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, fontStyle: 'italic' }}>
                Tiada pesakit dalam senarai menunggu.
              </p>
            ) : (
              <div className={styles.waitingChipsRow}>
                {senaraiMenunggu.map((g, idx) => (
                  <span key={idx} className={styles.waitingChip}>
                    {g.no_giliran}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticker Makluman Bergerak */}
      <footer className={styles.tickerFooter}>
        <div className={styles.tickerTrack}>
          {[...senaraiTicker, ...senaraiTicker].map((item, idx) => (
            <div key={idx} className={styles.tickerItem}>
              {item.teks_arab && (
                <span className={styles.arabicText}>۞ {item.teks_arab}</span>
              )}
              {item.kategori && item.kategori !== 'ayat_syifa' && (
                <span className={styles.noticeTag}>
                  {item.kategori === 'promosi' ? '★ PROMOSI' : '✦ MAKLUMAN'}
                </span>
              )}
              <span className={styles.translationText}>"{item.teks_maksud}"</span>
              {item.rujukan && (
                <span className={styles.surahRef}>({item.rujukan})</span>
              )}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}