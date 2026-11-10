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

  // Status Animasi Berkelip Semasa Suara Berkumandang
  const [sedangPanggilAudio, setSedangPanggilAudio] = useState<boolean>(false);

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

  // 1. Skrin Penuh & Buka Kunci Audio
  const aktifkanSkrinPenuhDanAudio = () => {
    setAudioDibenarkan(true);

    if (audioChimeRef.current) {
      audioChimeRef.current.currentTime = 0;
      audioChimeRef.current.volume = 1.0;
      audioChimeRef.current.play().catch(() => {});
    }

    if (audioTtsRef.current) {
      audioTtsRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      audioTtsRef.current.play().catch(() => {});
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

  // 6. Pengurusan Video Siaran TV
  const muatDataVideo = async () => {
    try {
      const { data: videoData } = await supabase
        .from('video_tv')
        .select('*')
        .eq('status_aktif', true)
        .order('created_at', { ascending: false });

      if (videoData && videoData.length > 0) {
        setSenaraiVideo(videoData);
        setVideoSemasa((prev) => {
          if (!prev) return videoData[0];
          const masihWujud = videoData.find((v) => v.id === prev.id);
          return masihWujud || videoData[0];
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

  // Redakan dan Pulihkan Audio Video Latar
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
  };

  const pulihkanAudioVideoLatar = () => {
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
    }, 1000);
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

  // ========================================================
  // 7. SISTEM AUDIO PANGGILAN GILIRAN (LOCENG + SUARA MELAYU)
  // ========================================================
  const janaTeksSebutanMelayu = (noGiliran: string, bilik: string, namaPerawat: string) => {
    const abjad = noGiliran.charAt(0).toUpperCase();
    const nomborBahagian = noGiliran.replace(/^[A-Za-z]+[-_\s]*/, '');

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
      .map((d) => sebutanDigit[d] || d)
      .join(', ');

    const bilikDieja = bilik
      .replace(/\b1\b/g, 'satu')
      .replace(/\b2\b/g, 'dua')
      .replace(/\b3\b/g, 'tiga')
      .replace(/\b4\b/g, 'empat')
      .replace(/\b5\b/g, 'lima')
      .replace(/\b6\b/g, 'enam')
      .replace(/\b7\b/g, 'tujuh')
      .replace(/\b8\b/g, 'lapan')
      .replace(/\b9\b/g, 'sembilan');

    let ayat = `Nombor giliran, ${abjad}, ${digitDieja}. Sila masuk ke ${bilikDieja}.`;
    if (namaPerawat && !namaPerawat.toLowerCase().includes('tabib bertugas')) {
      ayat += ` Bersama ${namaPerawat}.`;
    }
    return ayat;
  };

  const panggilSuara = (noGiliran: string, bilik: string, namaPerawat: string) => {
    redakanAudioVideoLatar();
    setSedangPanggilAudio(true);

    const ayatSebutan = janaTeksSebutanMelayu(noGiliran, bilik, namaPerawat);
    const audioUrl = `/api/tts?text=${encodeURIComponent(ayatSebutan)}`;

    if (audioTtsRef.current) {
      audioTtsRef.current.src = audioUrl;
      audioTtsRef.current.load();
    }

    let suaraSudahMula = false;
    const mainkanSuaraPanggilan = () => {
      if (suaraSudahMula) return;
      suaraSudahMula = true;

      if (audioTtsRef.current) {
        audioTtsRef.current.volume = 1.0;
        audioTtsRef.current.onended = () => {
          setSedangPanggilAudio(false);
          pulihkanAudioVideoLatar();
        };
        audioTtsRef.current.onerror = () => {
          setSedangPanggilAudio(false);
          pulihkanAudioVideoLatar();
        };

        const playPromise = audioTtsRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            setSedangPanggilAudio(false);
            pulihkanAudioVideoLatar();
          });
        }
      } else {
        setSedangPanggilAudio(false);
        pulihkanAudioVideoLatar();
      }
    };

    if (audioChimeRef.current) {
      audioChimeRef.current.currentTime = 0;
      audioChimeRef.current.volume = 1.0;

      audioChimeRef.current.onended = () => {
        setTimeout(mainkanSuaraPanggilan, 350);
      };

      const playChime = audioChimeRef.current.play();
      if (playChime !== undefined) {
        playChime.catch(() => {
          setTimeout(mainkanSuaraPanggilan, 500);
        });
      }

      setTimeout(mainkanSuaraPanggilan, 2600);
    } else {
      mainkanSuaraPanggilan();
    }

    setTimeout(() => {
      setSedangPanggilAudio(false);
    }, 12000);
  };

  // 8. Muat Data Skrin & Status Bilik (Masa Nyata)
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

      if (giliranAktif && giliranAktif.length > 0) {
        const susunTerbaru = [...giliranAktif].sort((a, b) => {
          const masaA = new Date(a.waktu_panggil || a.updated_at || a.created_at).getTime();
          const masaB = new Date(b.waktu_panggil || b.updated_at || b.created_at).getTime();
          return masaB - masaA;
        });

        const palingKini = susunTerbaru[0];
        const tokenPanggilan = `${palingKini.id}_${palingKini.waktu_panggil || palingKini.updated_at || palingKini.status}`;

        const perawatObj = palingKini.perawat as any;
        const bilikUstaz = bilikData?.find(
          (b) =>
            (b.perawat_semasa_id && String(b.perawat_semasa_id) === String(palingKini.perawat_id)) ||
            (b.perawat?.id && String(b.perawat.id) === String(palingKini.perawat_id)) ||
            (perawatObj?.no_bilik && b.nama_bilik.toLowerCase().trim() === perawatObj.no_bilik.toLowerCase().trim())
        );

        const namaBilikSah = bilikUstaz ? bilikUstaz.nama_bilik : perawatObj?.no_bilik || 'Bilik Rawatan';
        const namaTabibSah = bilikUstaz?.perawat?.nama || perawatObj?.nama || 'Tabib Bertugas';

        const infoPanggilan: InfoPanggilan = {
          id: palingKini.id,
          noGiliran: palingKini.no_giliran,
          namaPesakit: (palingKini.pesakit as any)?.nama || 'Pesakit',
          bilik: namaBilikSah,
          namaPerawat: namaTabibSah,
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
        setSedangPanggilAudio(false);
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

      // Senarai Menunggu (Ejaan tepat: setSenaraiMenunggu)
      const { data: menungguData } = await supabase
        .from('giliran')
        .select('no_giliran')
        .eq('status', 'menunggu')
        .order('created_at', { ascending: true })
        .limit(6);

      if (menungguData) {
        setSenaraiMenunggu(menungguData);
      }
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
      {/* ANIMASI NOMBOR GILIRAN BERKELIP APABILA AUDIO BERKUMANDANG */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kelipNomborPanggilan {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            filter: drop-shadow(0 0 25px rgba(250, 204, 21, 0.95));
          }
          50% {
            opacity: 0.18;
            transform: scale(1.04);
            filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.25));
          }
        }
      `}} />

      <audio ref={audioChimeRef} src="/sounds/chime.mp3" preload="auto" playsInline />
      <audio ref={audioTtsRef} preload="auto" playsInline />

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

        {/* ========================================================
            HEADER ATAS (CUACA & TAKWIM SOLAT DIBESARKAN)
            ======================================================== */}
        <header className={styles.topBar}>
          <div className={styles.clinicBrand}>
            <img src="/logo.png" alt="SyifaLink" className={styles.logoImage} />
            <div>
              <span className={styles.welcomeText}>Selamat Datang ke</span>
              <h1 className={styles.clinicTitleText}>Pusat Rawatan Islam Darul Syifa'</h1>
            </div>
          </div>

          <div className={styles.islamicInfoBar} style={{ gap: '1.25rem' }}>
            {/* PIL LAPORAN CUACA */}
            <div 
              className={styles.weatherWidget}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                padding: '0.55rem 1.05rem',
                borderRadius: '0.75rem',
                border: '1.5px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
              }}
            >
              <CloudSun size={26} color="#38bdf8" />
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.02em' }}>
                {suhuCuaca} ({statusCuaca})
              </span>
            </div>

            {/* STRIP TAKWIM SOLAT */}
            <div 
              className={styles.prayerTimesStrip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.15rem',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                padding: '0.55rem 1.25rem',
                borderRadius: '0.75rem',
                border: '1.5px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
              }}
            >
              {Object.entries(jadualSolat).map(([namaSolat, waktu]) => (
                <div
                  key={namaSolat}
                  className={`${styles.prayerItem} ${solatAktif === namaSolat ? styles.prayerActive : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '0.45rem',
                    backgroundColor: solatAktif === namaSolat ? 'rgba(56, 189, 248, 0.18)' : 'transparent'
                  }}
                >
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: solatAktif === namaSolat ? '#38bdf8' : '#94a3b8',
                    letterSpacing: '0.05em'
                  }}>
                    {namaSolat}
                  </span>
                  <span style={{
                    fontSize: '1.12rem',
                    fontWeight: 800,
                    color: solatAktif === namaSolat ? '#38bdf8' : '#ffffff',
                    marginTop: '0.1rem',
                    letterSpacing: '0.02em'
                  }}>
                    {formatMasaSolat(waktu)}
                  </span>
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
          {/* ========================================================
              BARIS 1 KIRI: SEDANG DIPANGGIL
              ======================================================== */}
          <section 
            className={styles.nowSeeingCard}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: '1.25rem',
              paddingBottom: '1.25rem',
              height: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div className={styles.nowSeeingHeader} style={{ marginBottom: '0.2rem' }}>
              <span className={styles.nowSeeingTitle}>SEDANG DIPANGGIL</span>
              <span className={styles.nowSeeingSubtitle}>NOMBOR GILIRAN</span>
            </div>

            {panggilanTerkini ? (
              <>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '0.25rem',
                  marginBottom: '0.65rem',
                  width: '100%'
                }}>
                  <div 
                    className={styles.activeNumber}
                    style={{
                      lineHeight: 1,
                      margin: '0 0 0.25rem 0',
                      animation: sedangPanggilAudio ? 'kelipNomborPanggilan 0.65s infinite ease-in-out' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {panggilanTerkini.noGiliran}
                    {panggilanTerkini.perluKerusiRoda && (
                      <span className={styles.wheelchairIcon} title="Pesakit Memerlukan Kerusi Roda">♿</span>
                    )}
                  </div>

                  <div 
                    className={styles.patientName}
                    style={{
                      fontSize: '2.2rem',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      marginTop: '0.1rem',
                      textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      maxWidth: '96%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {panggilanTerkini.namaPesakit}
                  </div>
                </div>

                <div 
                  className={styles.proceedBox}
                  style={{
                    marginTop: '0.35rem',
                    marginBottom: '0.75rem',
                    padding: '1.1rem 1.35rem',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  <div 
                    className={styles.proceedLabel}
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Sila Masuk Ke
                  </div>

                  <div 
                    className={styles.roomDestinationRow}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.85rem',
                      margin: '0.2rem 0'
                    }}
                  >
                    <span 
                      className={styles.roomDestination}
                      style={{
                        fontSize: '3.3rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        letterSpacing: '0.02em'
                      }}
                    >
                      {panggilanTerkini.bilik}
                    </span>
                    <div 
                      className={styles.arrowCircle}
                      style={{
                        width: '44px',
                        height: '44px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ArrowRight size={28} strokeWidth={4} />
                    </div>
                  </div>

                  <div 
                    className={styles.perawatName}
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      marginTop: '0.45rem',
                      letterSpacing: '0.02em',
                      color: '#ffffff',
                      textShadow: '0 2px 6px rgba(0,0,0,0.35)'
                    }}
                  >
                    Bersama <strong style={{ color: '#fef08a' }}>{panggilanTerkini.namaPerawat}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyCallContent} style={{ margin: 'auto 0' }}>
                <Volume2 size={54} style={{ opacity: 0.6, marginBottom: '0.6rem' }} />
                <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Sila nantikan nombor anda diumumkan
                </p>
              </div>
            )}
          </section>

          {/* ========================================================
              BARIS 1 KANAN: STATUS BILIK RAWATAN
              (NAMA BILIK DITUKAR KE WARNA BIRU GELAP PEKAT)
              ======================================================== */}
          <section className={styles.doctorStatusCard}>
            <div className={styles.doctorStatusHeader}>
              <span className={styles.doctorStatusTitle} style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                <Stethoscope size={22} /> STATUS BILIK RAWATAN
              </span>
              {semuaBilikStatus.length > 4 && (
                <span className={styles.pageIndicatorPill} style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Paparan {halamanBilik + 1} / {jumlahHalaman}
                </span>
              )}
            </div>

            <div className={styles.doctorStatusList} style={{ gap: '0.85rem' }}>
              {bilikDipaparkan.map((b) => {
                const adaUstaz = Boolean(b.ustazNama);
                const sedangAktif = Boolean(b.sedangMerawat);

                return (
                  <div
                    key={b.id}
                    className={`${styles.roomRow} ${sedangAktif ? styles.roomRowBusy : ''}`}
                    style={{
                      padding: '0.95rem 1.25rem',
                      borderRadius: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    {/* NOMBOR BILIK (WARNA BIRU GELAP) & NAMA PERAWAT */}
                    <div className={styles.roomDoctorCol} style={{ flex: '1 1 auto' }}>
                      <div 
                        className={styles.roomLabelTitle}
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 900,
                          color: '#0f2942', // WARNA BIRU GELAP PEKAT (JELAS DIBACA)
                          letterSpacing: '0.03em',
                          lineHeight: 1.15
                        }}
                      >
                        {b.namaBilik}
                      </div>
                      <div 
                        className={styles.roomDoctorName}
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: adaUstaz ? '#0284c7' : '#64748b',
                          marginTop: '0.25rem',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {adaUstaz ? b.ustazNama : <span className={styles.rehatText}>Rehat / Kosong</span>}
                      </div>
                    </div>

                    {/* STATUS RAWATAN DI BILIK */}
                    <div className={styles.roomStatusCol} style={{ textAlign: 'right', marginRight: '1rem' }}>
                      {sedangAktif ? (
                        <span 
                          className={styles.statusSeeing}
                          style={{
                            fontSize: '1.08rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem'
                          }}
                        >
                          <span className={styles.pulseDot} style={{ width: '10px', height: '10px' }}></span>
                          {b.statusRawatan === 'dipanggil' ? 'Sedang Dipanggil' : 'Sedang Merawat'} (<strong>{b.noGiliranAktif}</strong>)
                        </span>
                      ) : adaUstaz ? (
                        <span 
                          className={styles.statusAvailable}
                          style={{ fontSize: '1.05rem', fontWeight: 700 }}
                        >
                          Sedia Menerima Pesakit
                        </span>
                      ) : (
                        <span 
                          className={styles.statusClosed}
                          style={{ fontSize: '1rem', fontWeight: 500, fontStyle: 'italic', opacity: 0.8 }}
                        >
                          Bilik Tidak Beroperasi
                        </span>
                      )}
                    </div>

                    {/* PIL STATUS AKTIF / TERSEDIA / TUTUP */}
                    <div className={styles.roomWaitCol}>
                      {sedangAktif ? (
                        <div className={styles.badgeBusyPill} style={{ fontSize: '0.85rem', fontWeight: 800, padding: '0.35rem 0.85rem' }}>
                          Aktif
                        </div>
                      ) : adaUstaz ? (
                        <div className={styles.badgeAvailablePill} style={{ fontSize: '0.85rem', fontWeight: 800, padding: '0.35rem 0.85rem' }}>
                          Tersedia
                        </div>
                      ) : (
                        <div className={styles.badgeClosedPill} style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0.35rem 0.85rem' }}>
                          Tutup
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========================================================
              BARIS 2 KIRI: PEMAIN VIDEO (BEBAS SCREEN HITAM & MERAPAT)
              ======================================================== */}
          <div style={{
            height: '100%',
            minHeight: '220px',
            backgroundColor: '#022432', // WARNA LATAR SAMA DENGAN TEMA (TIADA KONTRAST HITAM)
            borderRadius: '1.25rem',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
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
                  backgroundColor: '#022432'
                }}>
                  <iframe
                    ref={iframePlayerRef}
                    key={videoSemasa.id}
                    src={janaYouTubeEmbedUrl(videoSemasa.url_video, videoSemasa.loop_tunggal)}
                    title={videoSemasa.tajuk}
                    style={{
                      width: '135%',
                      height: '135%',
                      border: 'none',
                      transform: 'scale(1.35)', // ZUM RAPAT SUPAYA SCREEN HITAM KIRI/KANAN TIDAK KELIHATAN
                      transformOrigin: 'center center',
                      pointerEvents: 'none'
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