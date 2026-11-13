// app/tv/page.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './tv.module.css';
import { Volume2, VolumeX, Users, Stethoscope, CloudSun, ArrowRight, X, Film, Play, Pause } from 'lucide-react';

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

  // Status Kawalan Manual & Hover Tag Bawah Video
  const [videoDijedaManual, setVideoDijedaManual] = useState<boolean>(false);
  const [barHovered, setBarHovered] = useState<boolean>(false);

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

  // Ref Sentiasa Terkini
  const audioDibenarkanRef = useRef<boolean>(false);
  const videoSemasaRef = useRef<ItemVideo | null>(null);
  const videoDijedaManualRef = useRef<boolean>(false);
  const sedangPanggilRef = useRef<boolean>(false);
  const timerPulihAudioRef = useRef<NodeJS.Timeout | null>(null);

  const panggilanTerkiniRef = useRef<string | null>(null);
  const audioChimeRef = useRef<HTMLAudioElement | null>(null);
  const audioTtsRef = useRef<HTMLAudioElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const iframePlayerRef = useRef<HTMLIFrameElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const btnAktifRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    audioDibenarkanRef.current = audioDibenarkan;
  }, [audioDibenarkan]);

  useEffect(() => {
    videoSemasaRef.current = videoSemasa;
  }, [videoSemasa]);

  useEffect(() => {
    videoDijedaManualRef.current = videoDijedaManual;
  }, [videoDijedaManual]);

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

  // Kekalkan Skrin TV Sentiasa Menyala (Screen Wake Lock untuk Android TV / Smart TV)
  const aktifkanWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    aktifkanWakeLock();
    const tanganiVisibiliti = () => {
      if (document.visibilityState === 'visible') {
        aktifkanWakeLock();
      }
    };
    document.addEventListener('visibilitychange', tanganiVisibiliti);
    return () => {
      document.removeEventListener('visibilitychange', tanganiVisibiliti);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [aktifkanWakeLock]);

  // Helper Kawalan YouTube Iframe
  const hantarArahanYouTube = useCallback((func: string, args: any[] = []) => {
    if (iframePlayerRef.current && iframePlayerRef.current.contentWindow) {
      iframePlayerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  }, []);

  // Laraskan Audio Video Tanpa Mengganggu Penstriman
  const selarasAudioVideo = useCallback(
    (benarkanBunyi: boolean) => {
      const videoKini = videoSemasaRef.current;
      if (!videoKini) return;

      const volPeratus = videoKini.kelantangan_audio ?? 20;
      const perluBisu = !benarkanBunyi || volPeratus === 0 || sedangPanggilRef.current;

      if (videoPlayerRef.current) {
        videoPlayerRef.current.volume = volPeratus / 100;
        videoPlayerRef.current.muted = perluBisu;
      }

      if (iframePlayerRef.current && iframePlayerRef.current.contentWindow) {
        if (perluBisu) {
          hantarArahanYouTube('mute');
        } else {
          hantarArahanYouTube('unMute');
          hantarArahanYouTube('setVolume', [volPeratus]);
        }
      }
    },
    [hantarArahanYouTube]
  );

  // Kawalan Butang Play / Pause Video Manual
  const togglePlayPauseVideo = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!audioDibenarkanRef.current) {
      audioDibenarkanRef.current = true;
      setAudioDibenarkan(true);
    }

    const statusBaharuDijeda = !videoDijedaManualRef.current;
    videoDijedaManualRef.current = statusBaharuDijeda;
    setVideoDijedaManual(statusBaharuDijeda);

    const volPeratus = videoSemasaRef.current?.kelantangan_audio ?? 20;

    if (videoPlayerRef.current) {
      if (statusBaharuDijeda) {
        videoPlayerRef.current.pause();
      } else {
        videoPlayerRef.current.muted = volPeratus === 0;
        videoPlayerRef.current.volume = volPeratus / 100;
        videoPlayerRef.current.play().catch(() => {});
      }
    }

    if (iframePlayerRef.current && iframePlayerRef.current.contentWindow) {
      if (statusBaharuDijeda) {
        hantarArahanYouTube('pauseVideo');
      } else {
        hantarArahanYouTube('playVideo');
        if (volPeratus > 0) {
          hantarArahanYouTube('unMute');
          hantarArahanYouTube('setVolume', [volPeratus]);
        }
      }
    }
  };

  // 1. Skrin Penuh & Buka Kunci Audio + Video
  const aktifkanSkrinPenuhDanAudio = useCallback(() => {
    audioDibenarkanRef.current = true;
    setAudioDibenarkan(true);
    aktifkanWakeLock();

    if (audioChimeRef.current) {
      audioChimeRef.current.currentTime = 0;
      audioChimeRef.current.volume = 1.0;
      audioChimeRef.current.play().catch(() => {});
    }

    if (audioTtsRef.current) {
      audioTtsRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audioTtsRef.current.play().catch(() => {});
    }

    selarasAudioVideo(true);
    if (videoPlayerRef.current && !videoDijedaManualRef.current) {
      videoPlayerRef.current.play().catch(() => {});
    }
    if (iframePlayerRef.current && !videoDijedaManualRef.current) {
      hantarArahanYouTube('playVideo');
    }

    const docEl = document.documentElement as any;
    const isFs =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement;

    if (!isFs) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().then(() => setIsSkrinPenuh(true)).catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        try {
          docEl.webkitRequestFullscreen();
          setIsSkrinPenuh(true);
        } catch (e) {}
      }
    }

    if (panggilanTerkini) {
      panggilSuara(panggilanTerkini.noGiliran, panggilanTerkini.bilik, panggilanTerkini.namaPerawat);
    }
  }, [aktifkanWakeLock, selarasAudioVideo, hantarArahanYouTube, panggilanTerkini]);

  const keluarSkrinPenuh = (e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = document as any;
    if (doc.fullscreenElement && doc.exitFullscreen) {
      doc.exitFullscreen().then(() => setIsSkrinPenuh(false)).catch(() => {});
    } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
      try {
        doc.webkitExitFullscreen();
        setIsSkrinPenuh(false);
      } catch (err) {}
    }
  };

  useEffect(() => {
    const semakPerubahanFullscreen = () => {
      const doc = document as any;
      setIsSkrinPenuh(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', semakPerubahanFullscreen);
    document.addEventListener('webkitfullscreenchange', semakPerubahanFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', semakPerubahanFullscreen);
      document.removeEventListener('webkitfullscreenchange', semakPerubahanFullscreen);
    };
  }, []);

  useEffect(() => {
    if (!audioDibenarkan && btnAktifRef.current) {
      btnAktifRef.current.focus();
    }
  }, [audioDibenarkan]);

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

  const tanganiVideoTamat = useCallback(() => {
    const videoKini = videoSemasaRef.current;
    if (!videoKini || senaraiVideo.length === 0) return;

    setVideoDijedaManual(false);
    videoDijedaManualRef.current = false;

    if (videoKini.loop_tunggal || senaraiVideo.length === 1) {
      if (videoPlayerRef.current) {
        videoPlayerRef.current.currentTime = 0;
        videoPlayerRef.current.play().catch(() => {});
      } else if (iframePlayerRef.current) {
        hantarArahanYouTube('seekTo', [0, true]);
        hantarArahanYouTube('playVideo');
      }
      return;
    }

    const videoLain = senaraiVideo.filter((v) => v.id !== videoKini.id);
    const videoRawak = videoLain[Math.floor(Math.random() * videoLain.length)];
    setVideoSemasa(videoRawak);
  }, [senaraiVideo, hantarArahanYouTube]);

  useEffect(() => {
    const tanganiMesejYouTube = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onStateChange' && data.info === 0) {
          tanganiVideoTamat();
        }
      } catch (e) {}
    };

    window.addEventListener('message', tanganiMesejYouTube);
    return () => window.removeEventListener('message', tanganiMesejYouTube);
  }, [tanganiVideoTamat]);

  useEffect(() => {
    if (!videoSemasa) return;
    setVideoDijedaManual(false);
    videoDijedaManualRef.current = false;
  }, [videoSemasa]);

  const redakanAudioVideoLatar = useCallback(() => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.muted = true;
      videoPlayerRef.current.pause();
    }
    hantarArahanYouTube('mute');
    hantarArahanYouTube('pauseVideo');
  }, [hantarArahanYouTube]);

  const pulihkanAudioVideoLatar = useCallback(() => {
    if (timerPulihAudioRef.current) {
      clearTimeout(timerPulihAudioRef.current);
      timerPulihAudioRef.current = null;
    }

    sedangPanggilRef.current = false;
    setSedangPanggilAudio(false);

    setTimeout(() => {
      const volPeratus = videoSemasaRef.current?.kelantangan_audio ?? 20;
      const bolehBunyi = audioDibenarkanRef.current && volPeratus > 0;
      const perluMain = !videoDijedaManualRef.current;

      if (videoPlayerRef.current) {
        const vid = videoPlayerRef.current;
        vid.muted = !bolehBunyi;
        vid.volume = volPeratus / 100;
        if (perluMain) {
          vid.play().catch(() => {
            vid.muted = true;
            vid.play().catch(() => {});
          });
        }
      }

      if (iframePlayerRef.current && iframePlayerRef.current.contentWindow) {
        if (perluMain) {
          hantarArahanYouTube('playVideo');
        }
        if (bolehBunyi) {
          hantarArahanYouTube('unMute');
          hantarArahanYouTube('setVolume', [volPeratus]);
        } else {
          hantarArahanYouTube('mute');
        }
      }
    }, 400);
  }, [hantarArahanYouTube]);

  const janaYouTubeEmbedUrl = (url: string, loop: boolean) => {
    let videoId = '';
    try {
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
      } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split(/[?&]/)[0];
      } else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1]?.split(/[?&]/)[0];
      } else if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.split(/[?&]/)[0];
      } else if (url.includes('live/')) {
        videoId = url.split('live/')[1]?.split(/[?&]/)[0];
      }
    } catch (e) {}

    if (!videoId) return url;

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1${
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

  const panggilSuara = useCallback(
    (noGiliran: string, bilik: string, namaPerawat: string) => {
      sedangPanggilRef.current = true;
      setSedangPanggilAudio(true);
      redakanAudioVideoLatar();

      if (timerPulihAudioRef.current) clearTimeout(timerPulihAudioRef.current);
      timerPulihAudioRef.current = setTimeout(() => {
        pulihkanAudioVideoLatar();
      }, 11000);

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
            pulihkanAudioVideoLatar();
          };
          audioTtsRef.current.onerror = () => {
            pulihkanAudioVideoLatar();
          };

          const playPromise = audioTtsRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              pulihkanAudioVideoLatar();
            });
          }
        } else {
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
    },
    [redakanAudioVideoLatar, pulihkanAudioVideoLatar]
  );

  // 8. Muat Data Skrin & Status Bilik (Masa Nyata)
  const muatDataSkrin = useCallback(async () => {
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
        if (sedangPanggilRef.current) {
          pulihkanAudioVideoLatar();
        }
      }

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
  }, [panggilSuara, pulihkanAudioVideoLatar]);

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
  }, [muatDataSkrin]);

  // 9. Penggiliran Paparan Bilik & Kawalan Remote TV
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

  useEffect(() => {
    const tanganiRemoteTV = (e: KeyboardEvent) => {
      if (e.key === 'MediaPlayPause' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePlayPauseVideo();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Select' || e.keyCode === 13 || e.keyCode === 23) {
        if (!audioDibenarkanRef.current) {
          e.preventDefault();
          aktifkanSkrinPenuhDanAudio();
        }
      } else if (e.key === 'ArrowRight' || e.keyCode === 39) {
        if (jumlahHalaman > 1) {
          setHalamanBilik((prev) => (prev + 1) % jumlahHalaman);
        }
      } else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
        if (jumlahHalaman > 1) {
          setHalamanBilik((prev) => (prev - 1 + jumlahHalaman) % jumlahHalaman);
        }
      }
    };

    window.addEventListener('keydown', tanganiRemoteTV);
    return () => window.removeEventListener('keydown', tanganiRemoteTV);
  }, [aktifkanSkrinPenuhDanAudio, jumlahHalaman]);

  const bilikDipaparkan = semuaBilikStatus.slice(halamanBilik * 4, (halamanBilik + 1) * 4);
  const isVideoMp4 = Boolean(
    videoSemasa && (videoSemasa.jenis === 'mp4' || videoSemasa.url_video.toLowerCase().includes('.mp4'))
  );

  return (
    <div
      className={styles.tvContainer}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      onClick={() => {
        if (!audioDibenarkanRef.current) {
          aktifkanSkrinPenuhDanAudio();
        }
      }}
    >
      {/* ANIMASI NOMBOR GILIRAN BERKELIP, FOKUS REMOTE TV & HOVER TAG VIDEO */}
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
        .tv-remote-focus:focus {
          outline: 3px solid #facc15 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.7) !important;
        }
        .video-bottom-trigger .video-bottom-bar {
          opacity: 0;
          visibility: hidden;
          transform: translateY(6px);
          transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s ease;
        }
        .video-bottom-trigger:hover .video-bottom-bar,
        .video-bottom-trigger.is-hovered .video-bottom-bar {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
      `}} />

      <audio ref={audioChimeRef} src="/sounds/chime.mp3" preload="auto" playsInline />
      <audio ref={audioTtsRef} preload="auto" playsInline />

      <div className={styles.exitZone}>
        <button
          type="button"
          onClick={keluarSkrinPenuh}
          className={`${styles.btnExitFullscreen} tv-remote-focus`}
          title="Keluar dari Mod Skrin Penuh"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className={styles.contentWrapper}>
        {!audioDibenarkan && (
          <div className={styles.audioBanner} style={{ padding: '0.38rem 0.9rem', fontSize: '0.8rem' }}>
            <span>Tekan <strong>OK</strong> pada Remote TV atau klik butang di sebelah untuk mengaktifkan suara &amp; video TV.</span>
            <button
              ref={btnAktifRef}
              type="button"
              autoFocus
              tabIndex={0}
              onClick={aktifkanSkrinPenuhDanAudio}
              className={`${styles.btnEnableAudio} tv-remote-focus`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
            >
              Aktifkan Suara Panggilan &amp; Skrin Penuh
            </button>
          </div>
        )}

        {/* ========================================================
            HEADER ATAS (DIPADATKAN SUPAYA JAM MUAT PENUH SKRIN TV)
            ======================================================== */}
        <header
          className={styles.topBar}
          style={{
            padding: '0.38rem 0.95rem',
            gap: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* PENJENAMAAN KLINIK */}
          <div className={styles.clinicBrand} style={{ gap: '0.5rem', minWidth: 0, flex: '1 1 auto' }}>
            <img src="/logo.png" alt="SyifaLink" className={styles.logoImage} style={{ width: '34px', height: '34px', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <span className={styles.welcomeText} style={{ fontSize: '0.66rem', display: 'block', lineHeight: 1.1 }}>
                Selamat Datang ke
              </span>
              <h1
                className={styles.clinicTitleText}
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Pusat Rawatan Islam Darussyifa&apos;
              </h1>
            </div>
          </div>

          {/* CUACA & TAKWIM SOLAT */}
          <div className={styles.islamicInfoBar} style={{ gap: '0.45rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {/* PIL LAPORAN CUACA */}
            <div 
              className={styles.weatherWidget}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.32rem',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                padding: '0.3rem 0.6rem',
                borderRadius: '0.55rem',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
              }}
            >
              <CloudSun size={16} color="#38bdf8" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                {suhuCuaca} ({statusCuaca})
              </span>
            </div>

            {/* STRIP TAKWIM SOLAT */}
            <div 
              className={styles.prayerTimesStrip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.42rem',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                padding: '0.28rem 0.6rem',
                borderRadius: '0.55rem',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
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
                    padding: '0.08rem 0.3rem',
                    borderRadius: '0.3rem',
                    backgroundColor: solatAktif === namaSolat ? 'rgba(56, 189, 248, 0.18)' : 'transparent'
                  }}
                >
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: solatAktif === namaSolat ? '#38bdf8' : '#94a3b8',
                    letterSpacing: '0.02em',
                    lineHeight: 1.1
                  }}>
                    {namaSolat}
                  </span>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: solatAktif === namaSolat ? '#38bdf8' : '#ffffff',
                    marginTop: '0.04rem',
                    lineHeight: 1.15
                  }}>
                    {formatMasaSolat(waktu)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* JAM DIGITAL & TARIKH */}
          <div className={styles.clockArea} style={{ flexShrink: 0, textAlign: 'right', paddingLeft: '0.25rem' }}>
            <div className={styles.digitalTime} style={{ fontSize: '1.22rem', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              {masaSekarang}
            </div>
            <div className={styles.digitalDate} style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
              {tarikhSekarang}
            </div>
          </div>
        </header>

        <div className={styles.mainLayout} style={{ gap: '0.75rem' }}>
          {/* ========================================================
              BARIS 1 KIRI: SEDANG DIPANGGIL
              ======================================================== */}
          <section 
            className={styles.nowSeeingCard}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.9rem',
              height: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            <div className={styles.nowSeeingHeader} style={{ marginBottom: 0 }}>
              <span className={styles.nowSeeingTitle} style={{ fontSize: '0.85rem' }}>SEDANG DIPANGGIL</span>
              <span className={styles.nowSeeingSubtitle} style={{ fontSize: '0.68rem' }}>NOMBOR GILIRAN</span>
            </div>

            {panggilanTerkini ? (
              <>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0.1rem 0',
                  width: '100%'
                }}>
                  <div 
                    className={styles.activeNumber}
                    style={{
                      fontSize: 'clamp(2.9rem, 4.8vw, 4.3rem)',
                      lineHeight: 1,
                      margin: '0 0 0.15rem 0',
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
                      fontSize: 'clamp(1.15rem, 1.75vw, 1.55rem)',
                      fontWeight: 700,
                      lineHeight: 1.15,
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
                    margin: 0,
                    padding: '0.5rem 0.9rem',
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
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      marginBottom: '0.08rem'
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
                      gap: '0.55rem',
                      margin: '0.05rem 0'
                    }}
                  >
                    <span 
                      className={styles.roomDestination}
                      style={{
                        fontSize: 'clamp(1.75rem, 2.8vw, 2.3rem)',
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
                        width: '30px',
                        height: '30px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ArrowRight size={18} strokeWidth={3.5} />
                    </div>
                  </div>

                  <div 
                    className={styles.perawatName}
                    style={{
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      marginTop: '0.15rem',
                      color: '#ffffff',
                      maxWidth: '96%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textShadow: '0 2px 6px rgba(0,0,0,0.35)'
                    }}
                  >
                    Bersama <strong style={{ color: '#fef08a' }}>{panggilanTerkini.namaPerawat}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyCallContent} style={{ margin: 'auto 0' }}>
                <Volume2 size={42} style={{ opacity: 0.6, marginBottom: '0.35rem' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                  Sila nantikan nombor anda diumumkan
                </p>
              </div>
            )}
          </section>

          {/* ========================================================
              BARIS 1 KANAN: STATUS BILIK RAWATAN
              ======================================================== */}
          <section
            className={styles.doctorStatusCard}
            style={{
              padding: '0.65rem 0.9rem',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            <div className={styles.doctorStatusHeader} style={{ marginBottom: '0.4rem', flexShrink: 0 }}>
              <span className={styles.doctorStatusTitle} style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                <Stethoscope size={18} /> STATUS BILIK RAWATAN
              </span>
              {semuaBilikStatus.length > 4 && (
                <span className={styles.pageIndicatorPill} style={{ fontSize: '0.74rem', fontWeight: 700, padding: '0.18rem 0.55rem' }}>
                  Paparan {halamanBilik + 1} / {jumlahHalaman}
                </span>
              )}
            </div>

            <div
              className={styles.doctorStatusList}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.38rem',
                flex: 1,
                justifyContent: 'space-between',
                minHeight: 0
              }}
            >
              {bilikDipaparkan.map((b) => {
                const adaUstaz = Boolean(b.ustazNama);
                const sedangAktif = Boolean(b.sedangMerawat);

                return (
                  <div
                    key={b.id}
                    className={`${styles.roomRow} ${sedangAktif ? styles.roomRowBusy : ''}`}
                    style={{
                      padding: '0.38rem 0.8rem',
                      borderRadius: '0.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.65rem',
                      flex: 1,
                      minHeight: 0
                    }}
                  >
                    {/* LAJUR KIRI: NAMA BILIK & TABIB */}
                    <div
                      className={styles.roomDoctorCol}
                      style={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        overflow: 'hidden'
                      }}
                    >
                      <div 
                        className={styles.roomLabelTitle}
                        style={{
                          fontSize: '0.96rem',
                          fontWeight: 800,
                          color: '#0f2942',
                          letterSpacing: '0.02em',
                          lineHeight: 1.15
                        }}
                      >
                        {b.namaBilik}
                      </div>
                      <div 
                        className={styles.roomDoctorName}
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: adaUstaz ? '#0284c7' : '#64748b',
                          marginTop: '0.1rem',
                          lineHeight: 1.15,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {adaUstaz ? b.ustazNama : <span className={styles.rehatText}>Rehat / Kosong</span>}
                      </div>
                    </div>

                    {/* LAJUR TENGAH: STATUS RAWATAN SEMASA */}
                    <div
                      className={styles.roomStatusCol}
                      style={{
                        textAlign: 'right',
                        flexShrink: 0
                      }}
                    >
                      {sedangAktif ? (
                        <span 
                          className={styles.statusSeeing}
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span className={styles.pulseDot} style={{ width: '7px', height: '7px' }}></span>
                          {b.statusRawatan === 'dipanggil' ? 'Sedang Dipanggil' : 'Sedang Merawat'} (<strong>{b.noGiliranAktif}</strong>)
                        </span>
                      ) : adaUstaz ? (
                        <span 
                          className={styles.statusAvailable}
                          style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                          Sedia Menerima Pesakit
                        </span>
                      ) : (
                        <span 
                          className={styles.statusClosed}
                          style={{ fontSize: '0.78rem', fontWeight: 500, fontStyle: 'italic', opacity: 0.85, whiteSpace: 'nowrap' }}
                        >
                          Bilik Tidak Beroperasi
                        </span>
                      )}
                    </div>

                    {/* LAJUR KANAN: LENCANA STATUS */}
                    <div className={styles.roomWaitCol} style={{ flexShrink: 0 }}>
                      {sedangAktif ? (
                        <div className={styles.badgeBusyPill} style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem' }}>
                          Aktif
                        </div>
                      ) : adaUstaz ? (
                        <div className={styles.badgeAvailablePill} style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem' }}>
                          Tersedia
                        </div>
                      ) : (
                        <div className={styles.badgeClosedPill} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem' }}>
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
              BARIS 2 KIRI: PEMAIN VIDEO (TAG TERSEMBUNYI HINGGA DIARAHKAN KURSOR)
              ======================================================== */}
          <div
            style={{
              height: '100%',
              minHeight: '185px',
              backgroundColor: '#022432',
              borderRadius: '1.1rem',
              overflow: 'hidden',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {videoSemasa ? (
              isVideoMp4 ? (
                <video
                  ref={videoPlayerRef}
                  key={videoSemasa.id}
                  src={videoSemasa.url_video}
                  autoPlay
                  muted={!audioDibenarkan || videoSemasa.kelantangan_audio === 0}
                  playsInline
                  preload="auto"
                  loop={videoSemasa.loop_tunggal || senaraiVideo.length === 1}
                  onLoadedData={() => selarasAudioVideo(audioDibenarkanRef.current)}
                  onPlay={() => {
                    setVideoDijedaManual(false);
                    videoDijedaManualRef.current = false;
                  }}
                  onPause={() => {
                    if (!sedangPanggilRef.current) {
                      setVideoDijedaManual(true);
                      videoDijedaManualRef.current = true;
                    }
                  }}
                  onEnded={tanganiVideoTamat}
                  onError={() => {
                    setTimeout(tanganiVideoTamat, 2500);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    pointerEvents: 'auto'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#022432'
                }}>
                  <iframe
                    ref={iframePlayerRef}
                    key={videoSemasa.id}
                    src={janaYouTubeEmbedUrl(
                      videoSemasa.url_video,
                      videoSemasa.loop_tunggal || senaraiVideo.length === 1
                    )}
                    title={videoSemasa.tajuk}
                    onLoad={() => {
                      setTimeout(() => {
                        if (iframePlayerRef.current?.contentWindow) {
                          iframePlayerRef.current.contentWindow.postMessage(
                            JSON.stringify({ event: 'listening', id: 1 }),
                            '*'
                          );
                        }
                        selarasAudioVideo(audioDibenarkanRef.current);
                      }, 1200);
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '106%',
                      height: '152%',
                      transform: 'translate(-50%, -50%)',
                      border: 'none',
                      pointerEvents: 'auto'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                </div>
              )
            ) : (
              <div style={{
                color: '#64748b',
                fontSize: '0.88rem',
                textAlign: 'center',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Film size={30} color="#0d9488" opacity={0.6} />
                <span style={{ fontWeight: 600 }}>Tiada video siaran aktif.</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tetapkan di Pusat Pentadbir (/admin)</span>
              </div>
            )}

            {/* ZON HOVER KHUSUS DI BAWAH VIDEO: MUNCUL HANYA APABILA KURSOR DIARAHKAN PADANYA */}
            {videoSemasa && (
              <div
                className={`video-bottom-trigger ${barHovered ? 'is-hovered' : ''}`}
                onMouseEnter={() => setBarHovered(true)}
                onMouseLeave={() => {
                  setBarHovered(false);
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '52px',
                  zIndex: 35,
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '0 10px 10px 10px',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  className="video-bottom-bar"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    opacity: barHovered ? 1 : 0,
                    visibility: barHovered ? 'visible' : 'hidden',
                    transform: barHovered ? 'translateY(0)' : 'translateY(6px)',
                    pointerEvents: barHovered ? 'auto' : 'none',
                    transition: 'opacity 0.22s ease, transform 0.22s ease, visibility 0.22s ease'
                  }}
                >
                  {/* TAG TAJUK VIDEO (KIRI BAWAH) */}
                  <div
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.88)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      maxWidth: '65%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <Film size={13} color="#38bdf8" />
                    <span>{videoSemasa.tajuk}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 500 }}>
                      • {videoSemasa.loop_tunggal ? 'Loop' : 'Rawak'} ({videoSemasa.kelantangan_audio}%)
                    </span>
                  </div>

                  {/* BUTANG MAIN / JEDA & AUDIO (KANAN BAWAH) */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <button
                      type="button"
                      onClick={togglePlayPauseVideo}
                      className="tv-remote-focus"
                      title={videoDijedaManual ? 'Mainkan Video (Play)' : 'Jedakan Video (Pause)'}
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '0.5rem',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)'
                      }}
                    >
                      {videoDijedaManual ? (
                        <>
                          <Play size={14} color="#34d399" /> Main
                        </>
                      ) : (
                        <>
                          <Pause size={14} color="#fbbf24" /> Jeda
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!audioDibenarkanRef.current) {
                          aktifkanSkrinPenuhDanAudio();
                        } else {
                          selarasAudioVideo(true);
                        }
                      }}
                      className="tv-remote-focus"
                      title="Pulihkan Audio Video"
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        color: '#38bdf8',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '0.5rem',
                        padding: '0.35rem 0.55rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)'
                      }}
                    >
                      {audioDibenarkan && (videoSemasa.kelantangan_audio ?? 20) > 0 ? (
                        <Volume2 size={15} />
                      ) : (
                        <VolumeX size={15} color="#f87171" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BARIS 2 KANAN: GILIRAN MENUNGGU SETERUSNYA */}
          <div className={styles.waitingBoxCard} style={{ padding: '0.65rem 0.9rem' }}>
            <div className={styles.waitingHeaderRow} style={{ fontSize: '0.88rem', marginBottom: '0.45rem' }}>
              <Users size={17} />
              <span>GILIRAN MENUNGGU SETERUSNYA</span>
            </div>

            {senaraiMenunggu.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0, fontStyle: 'italic' }}>
                Tiada pesakit dalam senarai menunggu.
              </p>
            ) : (
              <div className={styles.waitingChipsRow} style={{ gap: '0.45rem' }}>
                {senaraiMenunggu.map((g, idx) => (
                  <span
                    key={idx}
                    className={styles.waitingChip}
                    style={{ fontSize: '1rem', padding: '0.3rem 0.8rem' }}
                  >
                    {g.no_giliran}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className={styles.tickerFooter}>
        <div
          className={styles.tickerTrack}
          style={{
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)'
          }}
        >
          {[...senaraiTicker, ...senaraiTicker].map((item, idx) => (
            <div key={idx} className={styles.tickerItem}>
              {item.teks_arab && <span className={styles.arabicText}>۞ {item.teks_arab}</span>}
              {item.kategori && item.kategori !== 'ayat_syifa' && (
                <span className={styles.noticeTag}>
                  {item.kategori === 'promosi' ? '★ PROMOSI' : '✦ MAKLUMAN'}
                </span>
              )}
              <span className={styles.translationText}>&quot;{item.teks_maksud}&quot;</span>
              {item.rujukan && <span className={styles.surahRef}>({item.rujukan})</span>}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}