// app/tv/page.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './tv.module.css';
import {
  Volume2,
  VolumeX,
  Users,
  Stethoscope,
  CloudSun,
  ArrowRight,
  X,
  Film,
  Play,
  Pause,
  Pill,
  Clock
} from 'lucide-react';

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

type KodTemplateTV = 'klinik_klasik' | 'klinik_media' | 'klinik_puncak';

// Corak Geometri Islamik Ringan (SVG Inline - Mesra GPU Android TV & Smart TV)
const CORAK_ISLAMIK_TERANG = `url("data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230f766e' stroke-opacity='0.06' stroke-width='1'%3E%3Cpath d='M32 4L40 24L60 32L40 40L32 60L24 40L4 32L24 24Z'/%3E%3Crect x='14' y='14' width='36' height='36' transform='rotate(45 32 32)'/%3E%3Ccircle cx='32' cy='32' r='8'/%3E%3C/g%3E%3C/svg%3E")`;

const CORAK_ISLAMIK_SAND = `url("data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23785a28' stroke-opacity='0.07' stroke-width='1'%3E%3Cpath d='M32 4L40 24L60 32L40 40L32 60L24 40L4 32L24 24Z'/%3E%3Crect x='14' y='14' width='36' height='36' transform='rotate(45 32 32)'/%3E%3Ccircle cx='32' cy='32' r='8'/%3E%3C/g%3E%3C/svg%3E")`;

const CORAK_ISLAMIK_GELAP = `url("data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2334d399' stroke-opacity='0.09' stroke-width='1'%3E%3Cpath d='M32 4L40 24L60 32L40 40L32 60L24 40L4 32L24 24Z'/%3E%3Crect x='14' y='14' width='36' height='36' transform='rotate(45 32 32)'/%3E%3Ccircle cx='32' cy='32' r='8'/%3E%3C/g%3E%3C/svg%3E")`;

export default function SkrinTVDewan() {
  const [templateAktif, setTemplateAktif] = useState<KodTemplateTV>('klinik_klasik');

  const [masaSekarang, setMasaSekarang] = useState<string>('');
  const [tarikhSekarang, setTarikhSekarang] = useState<string>('');
  const [sesiOperasi, setSesiOperasi] = useState<string>('Sesi Pagi');
  const [audioDibenarkan, setAudioDibenarkan] = useState<boolean>(false);
  const [isSkrinPenuh, setIsSkrinPenuh] = useState<boolean>(false);

  // Status Animasi Berkelip Semasa Suara Berkumandang
  const [sedangPanggilAudio, setSedangPanggilAudio] = useState<boolean>(false);

  // Status Kawalan Manual & Hover Tag Bawah Video
  const [videoDijedaManual, setVideoDijedaManual] = useState<boolean>(false);
  const [barHovered, setBarHovered] = useState<boolean>(false);

  // Cuaca Semasa
  const [suhuCuaca, setSuhuCuaca] = useState<string>('27°C');
  const [statusCuaca, setStatusCuaca] = useState<string>('Cerah');

  // Panggilan, Status Bilik, Giliran Menunggu & Kaunter Farmasi
  const [panggilanTerkini, setPanggilanTerkini] = useState<InfoPanggilan | null>(null);
  const [semuaBilikStatus, setSemuaBilikStatus] = useState<any[]>([]);
  const [halamanBilik, setHalamanBilik] = useState<number>(0);
  const [senaraiMenunggu, setSenaraiMenunggu] = useState<any[]>([]);
  const [senaraiFarmasi, setSenaraiFarmasi] = useState<any[]>([]);
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

  // 2. Jam Digital & Sesi Operasi Klinik
  useEffect(() => {
    const kemaskiniWaktu = () => {
      const kini = new Date();
      setMasaSekarang(kini.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }));
      setTarikhSekarang(
        kini.toLocaleDateString('ms-MY', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      );

      const jam = kini.getHours();
      if (jam < 13) {
        setSesiOperasi('Sesi Pagi');
      } else if (jam < 18) {
        setSesiOperasi('Sesi Petang');
      } else {
        setSesiOperasi('Sesi Malam');
      }
    };
    kemaskiniWaktu();
    const pemasa = setInterval(kemaskiniWaktu, 1000);
    return () => clearInterval(pemasa);
  }, []);

  // 3. Cuaca Semasa
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

  // 4. Muat Ticker Pengumuman & Tetapan Templat TV Aktif dari Admin
  const muatDataPengumumanDanTemplate = useCallback(async () => {
    try {
      const { data: dataTicker } = await supabase
        .from('pengumuman_ticker')
        .select('*')
        .eq('status_aktif', true)
        .order('turutan', { ascending: true });

      if (dataTicker && dataTicker.length > 0) {
        const tapisTicker = dataTicker.filter((t) => t.rujukan !== '__SYSTEM_TEMPLATE_TV__');
        if (tapisTicker.length > 0) setSenaraiTicker(tapisTicker);
      }

      const { data: dataTemplate } = await supabase
        .from('pengumuman_ticker')
        .select('teks_maksud')
        .eq('rujukan', '__SYSTEM_TEMPLATE_TV__')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dataTemplate?.teks_maksud) {
        const kod = dataTemplate.teks_maksud as KodTemplateTV;
        if (kod === 'klinik_klasik' || kod === 'klinik_media' || kod === 'klinik_puncak') {
          setTemplateAktif(kod);
        }
      }
    } catch (err) {}
  }, []);

  // 5. Pengurusan Video Siaran TV
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
  // 6. SISTEM AUDIO PANGGILAN GILIRAN (LOCENG + SUARA MELAYU)
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

  // 7. Muat Data Skrin, Status Bilik, Menunggu & Farmasi (Masa Nyata)
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

      // Senarai Menunggu (Sehingga 12 nombor untuk Mod Waktu Puncak)
      const { data: menungguData } = await supabase
        .from('giliran')
        .select('no_giliran')
        .eq('status', 'menunggu')
        .order('created_at', { ascending: true })
        .limit(12);

      if (menungguData) {
        setSenaraiMenunggu(menungguData);
      }

      // Senarai Kaunter Farmasi (Pesakit sedia ambil penawar)
      const { data: farmasiData } = await supabase
        .from('giliran')
        .select('no_giliran, pesakit(nama)')
        .eq('status', 'farmasi')
        .order('updated_at', { ascending: false })
        .limit(8);

      if (farmasiData) {
        setSenaraiFarmasi(farmasiData);
      }
    } catch (err) {
      console.error('Ralat kemaskini TV:', err);
    }
  }, [panggilSuara, pulihkanAudioVideoLatar]);

  useEffect(() => {
    muatDataSkrin();
    muatDataPengumumanDanTemplate();
    const intervalPoll = setInterval(muatDataSkrin, 2000);

    const saluran = supabase
      .channel('tv_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giliran' }, () => muatDataSkrin())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bilik_rawatan' }, () => muatDataSkrin())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perawat' }, () => muatDataSkrin())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman_ticker' }, () =>
        muatDataPengumumanDanTemplate()
      )
      .subscribe();

    return () => {
      clearInterval(intervalPoll);
      supabase.removeChannel(saluran);
    };
  }, [muatDataSkrin, muatDataPengumumanDanTemplate]);

  // 8. Penggiliran Paparan Bilik & Kawalan Remote TV (D-Pad Android TV / Smart TV)
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
      } else if (e.key === '1') {
        setTemplateAktif('klinik_klasik');
      } else if (e.key === '2') {
        setTemplateAktif('klinik_media');
      } else if (e.key === '3') {
        setTemplateAktif('klinik_puncak');
      }
    };

    window.addEventListener('keydown', tanganiRemoteTV);
    return () => window.removeEventListener('keydown', tanganiRemoteTV);
  }, [aktifkanSkrinPenuhDanAudio, jumlahHalaman]);

  const bilikDipaparkan = semuaBilikStatus.slice(halamanBilik * 4, (halamanBilik + 1) * 4);
  const isVideoMp4 = Boolean(
    videoSemasa && (videoSemasa.jenis === 'mp4' || videoSemasa.url_video.toLowerCase().includes('.mp4'))
  );

  // Konfigurasi Tema Mengikut Templat Aktif
  const isSand = templateAktif === 'klinik_media';
  const isEmeraldDark = templateAktif === 'klinik_puncak';

  const bgUtama = isEmeraldDark ? '#04231d' : isSand ? '#f6f1e7' : '#eef6f6';
  const bgCorak = isEmeraldDark
    ? CORAK_ISLAMIK_GELAP
    : isSand
    ? CORAK_ISLAMIK_SAND
    : CORAK_ISLAMIK_TERANG;

  const warnaHeaderBg = isEmeraldDark
    ? '#063229'
    : isSand
    ? '#fffdf9'
    : '#ffffff';
  const warnaHeaderBorder = isEmeraldDark
    ? 'rgba(52, 211, 153, 0.25)'
    : isSand
    ? 'rgba(180, 134, 65, 0.28)'
    : 'rgba(13, 148, 136, 0.22)';
  const warnaTajukKlinik = isEmeraldDark ? '#f8fafc' : isSand ? '#1b4332' : '#0f2942';
  const warnaSubtajuk = isEmeraldDark ? '#6ee7b7' : isSand ? '#785a28' : '#0d9488';

  // Komponen Pemain Video Dikongsi antara Templat 1 & Templat 2
  const renderKotakVideo = (minHeightStr: string) => (
    <div
      style={{
        height: '100%',
        minHeight: minHeightStr,
        backgroundColor: '#022432',
        borderRadius: '1.1rem',
        overflow: 'hidden',
        border: isSand ? '2px solid rgba(180, 134, 65, 0.35)' : '2px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.22)',
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
          <div
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#022432'
            }}
          >
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
        <div
          style={{
            color: '#94a3b8',
            fontSize: '0.88rem',
            textAlign: 'center',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Film size={30} color="#0d9488" opacity={0.7} />
          <span style={{ fontWeight: 600 }}>Tiada video siaran aktif.</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tetapkan di Pusat Pentadbir (/admin)</span>
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
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.88)',
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

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
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
  );

  return (
    <div
      className={styles.tvContainer}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backgroundColor: bgUtama,
        backgroundImage: bgCorak,
        backgroundRepeat: 'repeat',
        transition: 'background-color 0.35s ease'
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
            filter: drop-shadow(0 0 22px rgba(250, 204, 21, 0.95));
          }
          50% {
            opacity: 0.22;
            transform: scale(1.03);
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
            <span>
              Tekan <strong>OK</strong> pada Remote TV atau klik butang di sebelah untuk mengaktifkan suara panggilan &amp; skrin penuh.
            </span>
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
            HEADER ATAS KHUSUS OPERASI KLINIK (TANPA TAQWIM SOLAT)
            ======================================================== */}
        <header
          className={styles.topBar}
          style={{
            padding: '0.4rem 1rem',
            gap: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: warnaHeaderBg,
            borderBottom: `1.5px solid ${warnaHeaderBorder}`,
            borderRadius: '0.85rem'
          }}
        >
          {/* PENJENAMAAN PUSAT RAWATAN */}
          <div className={styles.clinicBrand} style={{ gap: '0.55rem', minWidth: 0, flex: '1 1 auto' }}>
            <img
              src="/logo.png"
              alt="SyifaLink"
              className={styles.logoImage}
              style={{ width: '36px', height: '36px', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <span
                className={styles.welcomeText}
                style={{ fontSize: '0.68rem', display: 'block', lineHeight: 1.1, color: warnaSubtajuk, fontWeight: 700 }}
              >
                Klinik Pengubatan Islam • Ruang Menunggu Pesakit
              </span>
              <h1
                className={styles.clinicTitleText}
                style={{
                  fontSize: '0.98rem',
                  lineHeight: 1.15,
                  color: warnaTajukKlinik,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Pusat Rawatan Islam Darul Syifa&apos;
              </h1>
            </div>
          </div>

          {/* STATUS OPERASI KLINIK & CUACA */}
          <div style={{ gap: '0.45rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {/* PIL SESI KLINIK */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: isEmeraldDark ? 'rgba(16, 185, 129, 0.16)' : isSand ? '#efe7d6' : '#e6f4f1',
                padding: '0.32rem 0.65rem',
                borderRadius: '0.55rem',
                border: isEmeraldDark
                  ? '1px solid rgba(52, 211, 153, 0.35)'
                  : isSand
                  ? '1px solid rgba(180, 134, 65, 0.35)'
                  : '1px solid rgba(13, 148, 136, 0.25)'
              }}
            >
              <Clock size={15} color={isEmeraldDark ? '#34d399' : isSand ? '#785a28' : '#0d9488'} />
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: isEmeraldDark ? '#d1fae5' : isSand ? '#1b4332' : '#0f2942',
                  whiteSpace: 'nowrap'
                }}
              >
                {sesiOperasi}
              </span>
            </div>

            {/* PIL BILANGAN MENUNGGU & FARMASI */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                backgroundColor: isEmeraldDark ? 'rgba(6, 78, 59, 0.55)' : isSand ? '#efe7d6' : '#f1f5f9',
                padding: '0.32rem 0.7rem',
                borderRadius: '0.55rem',
                border: isEmeraldDark
                  ? '1px solid rgba(52, 211, 153, 0.25)'
                  : '1px solid rgba(148, 163, 184, 0.25)'
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: isEmeraldDark ? '#fde047' : '#0284c7',
                  whiteSpace: 'nowrap'
                }}
              >
                <Users size={14} /> Menunggu: {senaraiMenunggu.length}
              </span>

              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>|</span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: isEmeraldDark ? '#6ee7b7' : '#059669',
                  whiteSpace: 'nowrap'
                }}
              >
                <Pill size={14} /> Farmasi: {senaraiFarmasi.length}
              </span>
            </div>

            {/* PIL CUACA SEMASA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.32rem',
                backgroundColor: isEmeraldDark ? 'rgba(15, 23, 42, 0.65)' : '#0f2942',
                padding: '0.32rem 0.65rem',
                borderRadius: '0.55rem',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}
            >
              <CloudSun size={15} color="#38bdf8" />
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                {suhuCuaca} ({statusCuaca})
              </span>
            </div>
          </div>

          {/* JAM DIGITAL & TARIKH */}
          <div className={styles.clockArea} style={{ flexShrink: 0, textAlign: 'right', paddingLeft: '0.2rem' }}>
            <div
              className={styles.digitalTime}
              style={{
                fontSize: '1.24rem',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                color: isEmeraldDark ? '#facc15' : isSand ? '#1b4332' : '#0f2942'
              }}
            >
              {masaSekarang}
            </div>
            <div
              className={styles.digitalDate}
              style={{
                fontSize: '0.66rem',
                whiteSpace: 'nowrap',
                color: isEmeraldDark ? '#a7f3d0' : '#64748b'
              }}
            >
              {tarikhSekarang}
            </div>
          </div>
        </header>

        {/* ========================================================
            TEMPLAT 1: KLASIK KLINIK (SEIMBANG + CORAK ISLAMIK SANTAI)
            ======================================================== */}
        {templateAktif === 'klinik_klasik' && (
          <div className={styles.mainLayout} style={{ gap: '0.75rem' }}>
            {/* BARIS 1 KIRI: SEDANG DIPANGGIL (WARNA TEAL KLINIK) */}
            <section
              className={styles.nowSeeingCard}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.7rem 0.95rem',
                height: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
                borderRadius: '1.1rem',
                borderTop: '4px solid #facc15',
                backgroundColor: '#046c7a',
                backgroundImage: `${CORAK_ISLAMIK_GELAP}, linear-gradient(155deg, #078494 0%, #046272 55%, #02424f 100%)`,
                boxShadow: '0 10px 25px rgba(2, 66, 79, 0.28)',
                color: '#ffffff'
              }}
            >
              <div className={styles.nowSeeingHeader} style={{ marginBottom: 0, textAlign: 'center' }}>
                <span
                  className={styles.nowSeeingTitle}
                  style={{ fontSize: '0.85rem', letterSpacing: '0.08em', color: '#fef08a', fontWeight: 800, display: 'block' }}
                >
                  ✦ SEDANG DIPANGGIL ✦
                </span>
                <span
                  className={styles.nowSeeingSubtitle}
                  style={{ fontSize: '0.68rem', color: '#cffafe', fontWeight: 600, letterSpacing: '0.05em' }}
                >
                  NOMBOR GILIRAN RAWATAN
                </span>
              </div>

              {panggilanTerkini ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0.1rem 0',
                      width: '100%'
                    }}
                  >
                    <div
                      className={styles.activeNumber}
                      style={{
                        fontSize: 'clamp(2.9rem, 4.8vw, 4.3rem)',
                        fontWeight: 900,
                        color: '#a3e635',
                        lineHeight: 1,
                        margin: '0 0 0.15rem 0',
                        textShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                        animation: sedangPanggilAudio ? 'kelipNomborPanggilan 0.65s infinite ease-in-out' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {panggilanTerkini.noGiliran}
                      {panggilanTerkini.perluKerusiRoda && (
                        <span className={styles.wheelchairIcon} title="Pesakit Memerlukan Kerusi Roda">
                          ♿
                        </span>
                      )}
                    </div>

                    <div
                      className={styles.patientName}
                      style={{
                        fontSize: 'clamp(1.15rem, 1.75vw, 1.55rem)',
                        fontWeight: 700,
                        color: '#ffffff',
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
                      padding: '0.55rem 0.9rem',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      backgroundColor: 'rgba(2, 42, 52, 0.58)',
                      border: '1.5px solid rgba(250, 204, 21, 0.45)',
                      borderRadius: '0.85rem'
                    }}
                  >
                    <div
                      className={styles.proceedLabel}
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: '#e0f2fe',
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
                          color: '#ffffff',
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
                          borderRadius: '9999px',
                          backgroundColor: '#84cc16',
                          color: '#022c22',
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
                <div className={styles.emptyCallContent} style={{ margin: 'auto 0', color: '#e0f2fe', textAlign: 'center' }}>
                  <Volume2 size={42} style={{ opacity: 0.75, marginBottom: '0.35rem' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                    Sila nantikan nombor giliran anda diumumkan
                  </p>
                </div>
              )}
            </section>

            {/* BARIS 1 KANAN: STATUS BILIK RAWATAN */}
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
                  <Stethoscope size={18} /> STATUS BILIK RAWATAN KLINIK
                </span>
                {semuaBilikStatus.length > 4 && (
                  <span
                    className={styles.pageIndicatorPill}
                    style={{ fontSize: '0.74rem', fontWeight: 700, padding: '0.18rem 0.55rem' }}
                  >
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
                      <div style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
                        <div
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

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
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
                            {b.statusRawatan === 'dipanggil' ? 'Sedang Dipanggil' : 'Sedang Merawat'} (
                            <strong>{b.noGiliranAktif}</strong>)
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

                      <div style={{ flexShrink: 0 }}>
                        {sedangAktif ? (
                          <div className={styles.badgeBusyPill} style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem' }}>
                            Aktif
                          </div>
                        ) : adaUstaz ? (
                          <div
                            className={styles.badgeAvailablePill}
                            style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem' }}
                          >
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

            {/* BARIS 2 KIRI: PEMAIN VIDEO */}
            {renderKotakVideo('185px')}

            {/* BARIS 2 KANAN: GILIRAN MENUNGGU & SEDIA DI FARMASI */}
            <div
              className={styles.waitingBoxCard}
              style={{
                padding: '0.65rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.45rem'
              }}
            >
              <div>
                <div className={styles.waitingHeaderRow} style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <Users size={16} />
                  <span>GILIRAN MENUNGGU SETERUSNYA</span>
                </div>

                {senaraiMenunggu.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, fontStyle: 'italic' }}>
                    Tiada pesakit dalam senarai menunggu.
                  </p>
                ) : (
                  <div className={styles.waitingChipsRow} style={{ gap: '0.4rem' }}>
                    {senaraiMenunggu.slice(0, 6).map((g, idx) => (
                      <span
                        key={idx}
                        className={styles.waitingChip}
                        style={{ fontSize: '0.96rem', padding: '0.26rem 0.72rem' }}
                      >
                        {g.no_giliran}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {senaraiFarmasi.length > 0 && (
                <div
                  style={{
                    borderTop: '1px dashed rgba(13, 148, 136, 0.3)',
                    paddingTop: '0.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#059669',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Pill size={14} /> SEDIA DI FARMASI:
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem', overflow: 'hidden' }}>
                    {senaraiFarmasi.slice(0, 4).map((f, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: '#059669',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '0.18rem 0.55rem',
                          borderRadius: '0.35rem'
                        }}
                      >
                        {f.no_giliran}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TEMPLAT 2: FOKUS MEDIA & EDUKASI (WARM SAND & HIJAU ZAITUN)
            ======================================================== */}
        {templateAktif === 'klinik_media' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.65fr 1fr',
              gap: '0.75rem',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              width: '100%'
            }}
          >
            {/* LAJUR KIRI BESAR: VIDEO EDUKASI & PANDUAN RAWATAN */}
            {renderKotakVideo('240px')}

            {/* LAJUR KANAN: PANGGILAN SEMASA + 4 BILIK RAWATAN + MENUNGGU */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.42rem',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              {/* KAD PANGGILAN SEMASA (PADAT SUPAYA 4 BILIK DI BAWAH MUAT PENUH) */}
              <section
                style={{
                  backgroundColor: '#1b4332',
                  backgroundImage: CORAK_ISLAMIK_GELAP,
                  borderRadius: '0.85rem',
                  padding: '0.48rem 0.75rem',
                  color: '#ffffff',
                  borderTop: '3px solid #d4a373',
                  boxShadow: '0 6px 16px rgba(27, 67, 50, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.07em', color: '#fde68a', lineHeight: 1.1 }}>
                  ✦ PANGGILAN RAWATAN SEMASA ✦
                </span>

                {panggilanTerkini ? (
                  <>
                    <div
                      style={{
                        fontSize: 'clamp(2.05rem, 3.3vw, 2.85rem)',
                        fontWeight: 900,
                        color: '#facc15',
                        lineHeight: 1,
                        margin: '0.12rem 0 0.08rem 0',
                        animation: sedangPanggilAudio ? 'kelipNomborPanggilan 0.65s infinite ease-in-out' : 'none'
                      }}
                    >
                      {panggilanTerkini.noGiliran}
                    </div>
                    <div
                      style={{
                        fontSize: '0.94rem',
                        fontWeight: 700,
                        lineHeight: 1.15,
                        maxWidth: '96%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {panggilanTerkini.namaPesakit}
                    </div>
                    <div
                      style={{
                        marginTop: '0.28rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(253, 230, 138, 0.35)',
                        borderRadius: '0.5rem',
                        padding: '0.25rem 0.6rem',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fef08a', lineHeight: 1.1 }}>
                        {panggilanTerkini.bilik}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#d1fae5',
                          lineHeight: 1.15,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {panggilanTerkini.namaPerawat}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '0.55rem 0', color: '#d1fae5', fontSize: '0.82rem' }}>
                    Ruang menunggu tenang • Nantikan panggilan giliran anda
                  </div>
                )}
              </section>

              {/* STATUS BILIK RAWATAN AKTIF (4 BILIK MUAT PENUH TANPA TERPOTONG) */}
              <section
                style={{
                  backgroundColor: '#fffdf9',
                  border: '1px solid rgba(180, 134, 65, 0.32)',
                  borderRadius: '0.85rem',
                  padding: '0.42rem 0.65rem',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#1b4332',
                    marginBottom: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    lineHeight: 1.1
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Stethoscope size={14} color="#2d6a4f" /> BILIK RAWATAN AKTIF
                  </span>
                  {semuaBilikStatus.length > 4 && (
                    <span style={{ fontSize: '0.66rem', color: '#785a28', fontWeight: 700 }}>
                      {halamanBilik + 1}/{jumlahHalaman}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.22rem',
                    flex: 1,
                    minHeight: 0,
                    justifyContent: 'space-between'
                  }}
                >
                  {bilikDipaparkan.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.45rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.4rem',
                        backgroundColor: b.sedangMerawat ? '#ecfdf5' : '#f8f5ee',
                        border: b.sedangMerawat ? '1px solid #6ee7b7' : '1px solid #e7e0d0',
                        flex: 1,
                        minHeight: 0
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1b4332', lineHeight: 1.1 }}>
                          {b.namaBilik}
                        </div>
                        <div
                          style={{
                            fontSize: '0.66rem',
                            color: '#6b7280',
                            lineHeight: 1.1,
                            marginTop: '0.06rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {b.ustazNama || 'Rehat / Kosong'}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.14rem 0.45rem',
                          borderRadius: '0.3rem',
                          backgroundColor: b.sedangMerawat ? '#059669' : b.ustazNama ? '#d8f3dc' : '#e5e7eb',
                          color: b.sedangMerawat ? '#ffffff' : b.ustazNama ? '#1b4332' : '#6b7280',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {b.sedangMerawat ? b.noGiliranAktif : b.ustazNama ? 'Tersedia' : 'Tutup'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* GILIRAN SETERUSNYA */}
              <section
                style={{
                  backgroundColor: '#fffdf9',
                  border: '1px solid rgba(180, 134, 65, 0.32)',
                  borderRadius: '0.85rem',
                  padding: '0.4rem 0.65rem',
                  flexShrink: 0
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#785a28',
                    marginBottom: '0.22rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    lineHeight: 1.1
                  }}
                >
                  <Users size={13} /> GILIRAN SETERUSNYA
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {senaraiMenunggu.length === 0 ? (
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontStyle: 'italic' }}>Tiada menunggu</span>
                  ) : (
                    senaraiMenunggu.slice(0, 5).map((g, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: '#2d6a4f',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '0.35rem'
                        }}
                      >
                        {g.no_giliran}
                      </span>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ========================================================
            TEMPLAT 3: MOD WAKTU PUNCAK & FARMASI (EMERALD SERENITY)
            ======================================================== */}
        {templateAktif === 'klinik_puncak' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.55fr',
              gap: '0.85rem',
              flex: 1,
              minHeight: 0,
              width: '100%'
            }}
          >
            {/* LAJUR KIRI: PANGGILAN MEGA + PANGGILAN KAUNTER FARMASI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', minHeight: 0 }}>
              {/* KAD PANGGILAN MEGA */}
              <section
                style={{
                  flex: 1.35,
                  backgroundColor: '#06372e',
                  backgroundImage: CORAK_ISLAMIK_GELAP,
                  border: '2px solid rgba(52, 211, 153, 0.35)',
                  borderTop: '5px solid #facc15',
                  borderRadius: '1.1rem',
                  padding: '0.9rem 1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.1em', color: '#6ee7b7' }}>
                    ✦ SEDANG DIPANGGIL ✦
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a7f3d0', marginTop: '0.1rem' }}>
                    SILA BERSIAP SEDIA KE BILIK RAWATAN
                  </div>
                </div>

                {panggilanTerkini ? (
                  <>
                    <div
                      style={{
                        fontSize: 'clamp(3.6rem, 5.8vw, 5.2rem)',
                        fontWeight: 900,
                        color: '#facc15',
                        lineHeight: 1,
                        letterSpacing: '0.02em',
                        animation: sedangPanggilAudio ? 'kelipNomborPanggilan 0.65s infinite ease-in-out' : 'none'
                      }}
                    >
                      {panggilanTerkini.noGiliran}
                      {panggilanTerkini.perluKerusiRoda && <span style={{ marginLeft: '0.4rem' }}>♿</span>}
                    </div>

                    <div
                      style={{
                        fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
                        fontWeight: 700,
                        color: '#ffffff',
                        maxWidth: '96%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {panggilanTerkini.namaPesakit}
                    </div>

                    <div
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(4, 35, 29, 0.85)',
                        border: '1.5px solid rgba(250, 204, 21, 0.45)',
                        borderRadius: '0.85rem',
                        padding: '0.65rem 1rem',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 700 }}>Sila Masuk Ke</div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.6rem',
                          margin: '0.15rem 0'
                        }}
                      >
                        <span style={{ fontSize: 'clamp(2rem, 3.2vw, 2.7rem)', fontWeight: 900, color: '#fef08a' }}>
                          {panggilanTerkini.bilik}
                        </span>
                        <ArrowRight size={26} color="#facc15" strokeWidth={3.5} />
                      </div>
                      <div
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: '#d1fae5',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        Bersama <strong style={{ color: '#facc15' }}>{panggilanTerkini.namaPerawat}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#a7f3d0', fontSize: '1rem', fontWeight: 600 }}>
                    Sila nantikan nombor giliran anda diumumkan
                  </div>
                )}
              </section>

              {/* PANEL KAUNTER FARMASI (SEDIA AMBIL PENAWAR) */}
              <section
                style={{
                  flex: 0.75,
                  backgroundColor: '#06372e',
                  border: '1.5px solid rgba(251, 191, 36, 0.4)',
                  borderRadius: '1rem',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(52, 211, 153, 0.2)',
                    paddingBottom: '0.4rem'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: '#fbbf24',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Pill size={18} /> KAUNTER FARMASI (SEDIA AMBIL PENAWAR)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#a7f3d0', fontWeight: 700 }}>
                    {senaraiFarmasi.length} Pesakit
                  </span>
                </div>

                {senaraiFarmasi.length === 0 ? (
                  <p style={{ color: '#6ee7b7', fontSize: '0.84rem', margin: 'auto 0', fontStyle: 'italic' }}>
                    Tiada bungkusan penawar menunggu kutipan buat masa ini.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.45rem' }}>
                    {senaraiFarmasi.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#f59e0b',
                          color: '#04231d',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '0.5rem',
                          fontWeight: 900,
                          fontSize: '1.05rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <span>{f.no_giliran}</span>
                        {(f.pesakit as any)?.nama && (
                          <span style={{ fontSize: '0.76rem', fontWeight: 700, opacity: 0.9 }}>
                            • {(f.pesakit as any).nama.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* LAJUR KANAN: SEMUA BILIK RAWATAN SERENTAK + 12 GILIRAN MENUNGGU */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', minHeight: 0 }}>
              {/* GRID SEMUA BILIK RAWATAN */}
              <section
                style={{
                  flex: 1.35,
                  backgroundColor: '#06372e',
                  border: '1.5px solid rgba(52, 211, 153, 0.3)',
                  borderRadius: '1.1rem',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#6ee7b7',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <Stethoscope size={19} /> STATUS SEMUA BILIK RAWATAN
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#a7f3d0', fontWeight: 600 }}>
                    Paparan Langsung Semua Bilik
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.55rem',
                    flex: 1,
                    minHeight: 0
                  }}
                >
                  {semuaBilikStatus.map((b) => {
                    const adaUstaz = Boolean(b.ustazNama);
                    const sedangAktif = Boolean(b.sedangMerawat);

                    return (
                      <div
                        key={b.id}
                        style={{
                          backgroundColor: sedangAktif
                            ? 'rgba(250, 204, 21, 0.14)'
                            : adaUstaz
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(4, 35, 29, 0.65)',
                          border: sedangAktif
                            ? '1.5px solid #facc15'
                            : adaUstaz
                            ? '1px solid rgba(52, 211, 153, 0.35)'
                            : '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '0.75rem',
                          padding: '0.55rem 0.8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minWidth: 0
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>{b.namaBilik}</span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '0.4rem',
                              backgroundColor: sedangAktif ? '#facc15' : adaUstaz ? '#10b981' : '#334155',
                              color: sedangAktif ? '#04231d' : '#ffffff'
                            }}
                          >
                            {sedangAktif ? `Aktif • ${b.noGiliranAktif}` : adaUstaz ? 'Tersedia' : 'Tutup'}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: adaUstaz ? '#a7f3d0' : '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '0.2rem'
                          }}
                        >
                          {adaUstaz ? b.ustazNama : 'Tiada Tabib Bertugas'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* PANEL 12 GILIRAN MENUNGGU SETERUSNYA */}
              <section
                style={{
                  flex: 0.75,
                  backgroundColor: '#06372e',
                  border: '1.5px solid rgba(52, 211, 153, 0.3)',
                  borderRadius: '1rem',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(52, 211, 153, 0.2)',
                    paddingBottom: '0.4rem'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: '#6ee7b7',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Users size={18} /> SENARAI GILIRAN MENUNGGU ({senaraiMenunggu.length})
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#a7f3d0' }}>Sila bersedia apabila nombor hampir tiba</span>
                </div>

                {senaraiMenunggu.length === 0 ? (
                  <p style={{ color: '#6ee7b7', fontSize: '0.84rem', margin: 'auto 0', fontStyle: 'italic' }}>
                    Tiada pesakit dalam barisan menunggu.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.45rem' }}>
                    {senaraiMenunggu.map((g, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: idx === 0 ? '#34d399' : '#0f766e',
                          color: idx === 0 ? '#04231d' : '#ffffff',
                          border: idx === 0 ? '1.5px solid #fef08a' : '1px solid rgba(52, 211, 153, 0.35)',
                          fontSize: '1.08rem',
                          fontWeight: 900,
                          padding: '0.32rem 0.85rem',
                          borderRadius: '0.5rem'
                        }}
                      >
                        {g.no_giliran}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          TICKER BAWAH: AYAT SYIFA' & MAKLUMAN KLINIK
          ======================================================== */}
      <footer
        className={styles.tickerFooter}
        style={{
          backgroundColor: isEmeraldDark ? '#021713' : isSand ? '#1b4332' : undefined,
          borderTop: isEmeraldDark ? '1.5px solid rgba(52, 211, 153, 0.35)' : undefined
        }}
      >
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