// app/tv/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './tv.module.css';
import { Volume2, Users, Stethoscope, CloudSun, ArrowRight, X, Film } from 'lucide-react';

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

interface ItemVideo {
  id: string;
  tajuk: string;
  url_video: string;
  jenis: 'youtube' | 'mp4';
  loop_tunggal: boolean;
  kelantangan_audio: number;
  status_aktif: boolean;
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
  const [senaraiTicker, setSenaraiTicker] = useState<ItemTicker[]>([]);

  // Pemain Video TV
  const [senaraiVideo, setSenaraiVideo] = useState<ItemVideo[]>([]);
  const [videoSemasa, setVideoSemasa] = useState<ItemVideo | null>(null);

  const panggilanTerkiniRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChimeRef = useRef<HTMLAudioElement | null>(null);
  const audioTtsRef = useRef<HTMLAudioElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const iframePlayerRef = useRef<HTMLIFrameElement | null>(null);

  // Helper Pemformat Waktu Solat
  const formatMasaSolat = (waktu: any): string => {
    if (!waktu) return '--:--';
    if (typeof waktu === 'number' || (!isNaN(Number(waktu)) && String(waktu).length >= 10)) {
      const d = new Date(Number(waktu) * 1000);
      return d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return String(waktu);
  };

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

  // 1. Skrin Penuh & Buka Kunci Audio Kekal
  const aktifkanSkrinPenuhDanAudio = () => {
    setAudioDibenarkan(true);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }
    } catch (e) {}

    if (audioChimeRef.current) {
      audioChimeRef.current.play().then(() => {
        if (audioChimeRef.current) {
          audioChimeRef.current.pause();
          audioChimeRef.current.currentTime = 0;
        }
      }).catch(() => {});
    }

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
      }).catch(() => {});
    }

    if (panggilanTerkini) {
      panggilSuara(panggilanTerkini.noGiliran, panggilanTerkini.bilik, panggilanTerkini.namaPerawat);
    }
  };

  const keluarSkrinPenuh = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setIsSkrinPenuh(false);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const semakPerubahanFullscreen = () => {
      setIsSkrinPenuh(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', semakPerubahanFullscreen);
    return () => document.removeEventListener('fullscreenchange', semakPerubahanFullscreen);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
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

  // 3. Cuaca
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

  // 4. Waktu Solat
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

  // 5. Muat Ticker Pengumuman
  const muatDataPengumuman = async () => {
    try {
      const { data } = await supabase
        .from('pengumuman_ticker')
        .select('*')
        .eq('status_aktif', true)
        .order('turutan', { ascending: true });

      if (data && data.length > 0) setSenaraiTicker(data);
    } catch (err) {}
  };

  // 6. PENGURUSAN VIDEO SIARAN TV
  const muatDataVideo = async () => {
    try {
      const { data } = await supabase
        .from('video_tv')
        .select('*')
        .eq('status_aktif', true)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setSenaraiVideo(data);
        setVideoSemasa((prev) => {
          if (!prev) return data[0];
          const masihWujud = data.find((v) => v.id === prev.id);
          return masihWujud || data[0];
        });
      } else {
        setSenaraiVideo([]);
        setVideoSemasa(null);
      }
    } catch (e) {}
  };

  useEffect(() => {
    muatDataVideo();
    const ch = supabase
      .channel('tv_video_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_tv' }, () => muatDataVideo())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const tanganiVideoTamat = () => {
    if (!videoSemasa || senaraiVideo.length === 0) return;

    if (videoSemasa.loop_tunggal) {
      if (videoPlayerRef.current) {
        videoPlayerRef.current.currentTime = 0;
        videoPlayerRef.current.play().catch(() => {});
      }
      return;
    }

    if (senaraiVideo.length > 1) {
      const videoLain = senaraiVideo.filter((v) => v.id !== videoSemasa.id);
      const videoRawak = videoLain[Math.floor(Math.random() * videoLain.length)];
      setVideoSemasa(videoRawak);
    }
  };

  useEffect(() => {
    const tanganiMesejYouTube = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onStateChange' && data?.info === 0) {
          tanganiVideoTamat();
        }
      } catch (e) {}
    };

    window.addEventListener('message', tanganiMesejYouTube);
    return () => window.removeEventListener('message', tanganiMesejYouTube);
  }, [videoSemasa, senaraiVideo]);

  // Aras Kelantangan Video
  useEffect(() => {
    if (!videoSemasa) return;
    const volPeratus = videoSemasa.kelantangan_audio ?? 20;

    if (videoPlayerRef.current) {
      videoPlayerRef.current.volume = volPeratus / 100;
      videoPlayerRef.current.muted = volPeratus === 0;
    }

    if (iframePlayerRef.current && iframePlayerRef.current.contentWindow) {
      const postCmd = (func: string, args: any[] = []) => {
        iframePlayerRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      };

      setTimeout(() => {
        if (volPeratus === 0) {
          postCmd('mute');
        } else {
          postCmd('unMute');
          postCmd('setVolume', [volPeratus]);
        }
      }, 1500);
    }
  }, [videoSemasa]);

  // Redakan audio video semasa panggilan
  const redakanAudioVideoLatar = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.muted = true;
    }
    if (iframePlayerRef.current && iframePlayerRef.current.contentWindow) {
      iframePlayerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'mute', args: [] }),
        '*'
      );
    }

    setTimeout(() => {
      const volPeratus = videoSemasa?.kelantangan_audio ?? 20;
      if (videoPlayerRef.current) {
        videoPlayerRef.current.muted = volPeratus === 0;
        videoPlayerRef.current.volume = volPeratus / 100;
      }
      if (iframePlayerRef.current && iframePlayerRef.current.contentWindow && volPeratus > 0) {
        iframePlayerRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
          '*'
        );
        iframePlayerRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [volPeratus] }),
          '*'
        );
      }
    }, 11000);
  };

  const janaYouTubeEmbedUrl = (url: string, loop: boolean) => {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    }

    if (!videoId) return url;

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&enablejsapi=1${
      loop ? `&loop=1&playlist=${videoId}` : ''
    }`;
  };

  // 7. SISTEM AUDIO: HANYA LOCENG RASMI (TIADA BUNYI TING-TING-TING BUATAN)
  const mainkanChimeStudio = () => {
    try {
      if (audioChimeRef.current) {
        audioChimeRef.current.currentTime = 0;
        audioChimeRef.current.play().catch((err) => {
          console.warn('Ralat memainkan fail chime:', err);
        });
      }
    } catch (e) {
      console.warn('Ralat Chime Studio:', e);
    }
  };

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
      .map((digit) => sebutanDigit[digit] || digit)
      .join(', ');

    return `Nombor giliran, ${abjad}, ${digitDieja}. Sila masuk ke ${bilik}, bersama ${namaPerawat}.`;
  };

  // Sandaran Web Speech: Hanya jika pek suara Melayu/Indonesia wujud
  const mainkanWebSpeechJikaAda = (teks: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const senaraiSuara = window.speechSynthesis.getVoices();
      const suaraNusantara = senaraiSuara.find((v) =>
        v.lang.toLowerCase().startsWith('ms') ||
        v.lang.toLowerCase().startsWith('id') ||
        v.name.toLowerCase().includes('malay') ||
        v.name.toLowerCase().includes('melayu') ||
        v.name.toLowerCase().includes('indonesia')
      );

      // Elakkan suara robot Inggeris jika peranti tiada pek bahasa Melayu
      if (!suaraNusantara) {
        return;
      }

      window.speechSynthesis.cancel();
      const sebutan = new SpeechSynthesisUtterance(teks);
      sebutan.voice = suaraNusantara;
      sebutan.lang = suaraNusantara.lang;
      sebutan.rate = 0.88;
      sebutan.pitch = 1.0;
      window.speechSynthesis.speak(sebutan);
    } catch (err) {
      console.error('Ralat Web Speech:', err);
    }
  };

  const mainkanAudioMelayu = (teks: string) => {
    const audioUrl = `/api/tts?text=${encodeURIComponent(teks)}`;

    if (audioTtsRef.current) {
      const el = audioTtsRef.current;
      el.volume = 1.0;

      let dimainkan = false;

      const onPlaying = () => {
        dimainkan = true;
        el.removeEventListener('playing', onPlaying);
        el.removeEventListener('error', onError);
      };

      const onError = () => {
        el.removeEventListener('playing', onPlaying);
        el.removeEventListener('error', onError);
        if (!dimainkan) {
          try {
            const directAudio = new Audio();
            directAudio.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(teks)}&tl=ms&client=tw-ob`;
            directAudio.volume = 1.0;
            directAudio.play().catch(() => {
              mainkanWebSpeechJikaAda(teks);
            });
          } catch (e) {
            mainkanWebSpeechJikaAda(teks);
          }
        }
      };

      el.addEventListener('playing', onPlaying);
      el.addEventListener('error', onError);

      el.src = audioUrl;
      el.load();
      el.play().catch(() => {
        onError();
      });
    } else {
      mainkanWebSpeechJikaAda(teks);
    }
  };

  const panggilSuara = (noGiliran: string, bilik: string, namaPerawat: string) => {
    // 1. Redakan video latar belakang
    redakanAudioVideoLatar();

    // 2. Mainkan loceng chime rasmi sahaja
    mainkanChimeStudio();

    const ayatSebutan = janaTeksSebutanMelayu(noGiliran, bilik, namaPerawat);

    // 3. Suara Bahasa Melayu berbunyi selepas bunyi loceng selesai
    setTimeout(() => {
      mainkanAudioMelayu(ayatSebutan);
    }, 2400);
  };

  // 8. Muat Data Skrin & Status Bilik (Tapisan Bilik Bertugas Aktif)
  const muatDataSkrin = async () => {
    try {
      const { data: bilikData } = await supabase
        .from('bilik_rawatan')
        .select('*, perawat(id, nama, no_bilik)')
        .order('id', { ascending: true });

      const { data: semuaPerawat } = await supabase
        .from('perawat')
        .select('*')
        .eq('status_aktif', true);

      const { data: giliranAktif } = await supabase
        .from('giliran')
        .select('*, pesakit(nama), perawat(id, nama, no_bilik)')
        .in('status', ['dipanggil', 'sedang_rawat', 'rawatan']);

      const senaraiBilikBertugas = bilikData?.filter((b) => b.status_aktif && b.perawat_semasa_id) || [];

      const giliranSah = giliranAktif?.filter((g) => {
        if (!g.perawat_id) return false;
        return senaraiBilikBertugas.some((b) => String(b.perawat_semasa_id) === String(g.perawat_id));
      }) || [];

      if (giliranSah.length > 0) {
        const susunTerbaru = [...giliranSah].sort((a, b) => {
          const masaA = new Date(a.waktu_panggil || a.updated_at || a.created_at).getTime();
          const masaB = new Date(b.waktu_panggil || b.updated_at || b.created_at).getTime();
          return masaB - masaA;
        });

        const palingKini = susunTerbaru[0];
        const tokenPanggilan = `${palingKini.id}_${palingKini.waktu_panggil || palingKini.status || ''}`;

        const perawatObj = palingKini.perawat as any;
        const bilikUstaz = senaraiBilikBertugas.find(
          (b) => String(b.perawat_semasa_id) === String(palingKini.perawat_id)
        );

        const namaBilikSah = bilikUstaz ? bilikUstaz.nama_bilik : 'Bilik Rawatan';

        const infoPanggilan: InfoPanggilan = {
          id: palingKini.id,
          noGiliran: palingKini.no_giliran,
          namaPesakit: (palingKini.pesakit as any)?.nama || 'Pesakit',
          bilik: namaBilikSah,
          namaPerawat: bilikUstaz?.perawat?.nama || perawatObj?.nama || 'Tabib Bertugas',
          perluKerusiRoda: Boolean((palingKini as any)?.perlu_kerusi_roda)
        };

        setPanggilanTerkini(infoPanggilan);

        if (tokenPanggilan !== panggilanTerkiniRef.current) {
          panggilanTerkiniRef.current = tokenPanggilan;
          panggilSuara(infoPanggilan.noGiliran, infoPanggilan.bilik, infoPanggilan.namaPerawat);
        }
      } else {
        setPanggilanTerkini(null);
        panggilanTerkiniRef.current = null;
      }

      // Status Bilik Rawatan
      if (bilikData) {
        const bilikKemaskini = bilikData.map((b) => {
          const perawatBilik =
            b.perawat ||
            semuaPerawat?.find(
              (p) =>
                (b.perawat_semasa_id && String(p.id) === String(b.perawat_semasa_id)) ||
                (p.no_bilik && p.no_bilik.toLowerCase().trim() === b.nama_bilik.toLowerCase().trim())
            );
          const namaPerawat = perawatBilik?.nama || null;

          const rawatanBilik = giliranSah.find((g: any) => {
            return String(b.perawat_semasa_id) === String(g.perawat_id);
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

      // Senarai Menunggu
      const { data: menungguData } = await supabase
        .from('giliran')
        .select('no_giliran')
        .eq('status', 'menunggu')
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
    const intervalPoll = setInterval(muatDataSkrin, 2000);

    const saluran = supabase
      .channel('tv_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giliran' }, () => muatDataSkrin())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bilik_rawatan' }, () => muatDataSkrin())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perawat' }, () => muatDataSkrin())
      .subscribe();

    return () => {
      clearInterval(intervalPoll);
      supabase.removeChannel(saluran);
    };
  }, []);

  // 9. Penggiliran Paparan Bilik
  const jumlahHalaman = Math.max(1, Math.ceil(semuaBilikStatus.length / 4));

  useEffect(() => {
    if (semuaBilikStatus.length <= 4) {
      setHalamanBilik(0);
      return;
    }

    const timerCarousel = setInterval(() => {
      setHalamanBilik((prev) => (prev + 1) % jumlahHalaman);
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
            <button onClick={aktifkanSkrinPenuhDanAudio} className={styles.btnEnableAudio}>
              Aktifkan Suara Panggilan & Skrin Penuh
            </button>
          </div>
        )}

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
                        <span className={styles.statusAvailable}>Sedia Menerima Pesakit</span>
                      ) : (
                        <span className={styles.statusClosed}>Bilik Tidak Beroperasi</span>
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

          {/* BARIS 2 KIRI: PEMAIN VIDEO TERAPUNG */}
          <div style={{
            height: '100%',
            minHeight: '220px',
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            border: '2px solid #ffffff',
            boxShadow: '0 20px 35px -8px rgba(13, 148, 136, 0.18), 0 10px 15px -5px rgba(0, 0, 0, 0.06)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            {videoSemasa ? (
              videoSemasa.jenis === 'mp4' || videoSemasa.url_video.endsWith('.mp4') ? (
                <video
                  ref={videoPlayerRef}
                  key={videoSemasa.id}
                  src={videoSemasa.url_video}
                  autoPlay
                  playsInline
                  loop={videoSemasa.loop_tunggal}
                  onEnded={tanganiVideoTamat}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ffffff'
                }}>
                  <iframe
                    ref={iframePlayerRef}
                    key={videoSemasa.id}
                    src={janaYouTubeEmbedUrl(videoSemasa.url_video, videoSemasa.loop_tunggal)}
                    title={videoSemasa.tajuk}
                    style={{
                      width: '104%',
                      height: '104%',
                      border: 'none',
                      transform: 'scale(1.08)',
                      transformOrigin: 'center center'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )
            ) : (
              <div style={{
                color: '#64748b',
                fontSize: '0.9rem',
                textAlign: 'center',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Film size={34} color="#0d9488" opacity={0.6} />
                <span style={{ fontWeight: 600 }}>Tiada video siaran aktif.</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Tetapkan di Pusat Pentadbir (/admin)</span>
              </div>
            )}

            {videoSemasa && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '0.3rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#ffffff',
                maxWidth: '85%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.18)'
              }}>
                <Film size={13} color="#38bdf8" />
                <span>{videoSemasa.tajuk}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 500 }}>
                  • {videoSemasa.loop_tunggal ? 'Loop' : 'Rawak'} ({videoSemasa.kelantangan_audio}%)
                </span>
              </div>
            )}
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

      <footer className={styles.tickerFooter}>
        <div className={styles.tickerTrack}>
          {[...senaraiTicker, ...senaraiTicker].map((item, idx) => (
            <div key={idx} className={styles.tickerItem}>
              {item.teks_arab && <span className={styles.arabicText}>۞ {item.teks_arab}</span>}
              {item.kategori && item.kategori !== 'ayat_syifa' && (
                <span className={styles.noticeTag}>
                  {item.kategori === 'promosi' ? '★ PROMOSI' : '✦ MAKLUMAN'}
                </span>
              )}
              <span className={styles.translationText}>"{item.teks_maksud}"</span>
              {item.rujukan && <span className={styles.surahRef}>({item.rujukan})</span>}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}