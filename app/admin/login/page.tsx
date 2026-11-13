// app/admin/login/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Lock, User, KeyRound, LogIn, ArrowLeft, ShieldCheck } from 'lucide-react';

function BorangLogMasuk() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destinasi = searchParams.get('redirect') || '/admin';

  const [usernameAtauEmail, setUsernameAtauEmail] = useState('');
  const [password, setPassword] = useState('');
  const [memproses, setMemproses] = useState(false);
  const [semakSesiAwal, setSemakSesiAwal] = useState(true);
  const [ralatMesej, setRalatMesej] = useState('');

  // Jika sudah log masuk, terus ke destinasi
  useEffect(() => {
    const semakSesi = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(destinasi);
        return;
      }
      setSemakSesiAwal(false);
    };
    semakSesi();
  }, [router, destinasi]);

  const tanganiLogMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setRalatMesej('');

    const inputPengguna = usernameAtauEmail.trim();
    if (!inputPengguna || !password) {
      setRalatMesej('Sila masukkan username/e-mel dan kata laluan.');
      return;
    }

    setMemproses(true);
    try {
      let emailUntukLogin = inputPengguna;

      // Jika pengguna memasukkan username (tanpa simbol '@'), cari alamat e-mel sepadan dalam admin_profil
      if (!emailUntukLogin.includes('@')) {
        const { data: padanNama } = await supabase
          .from('admin_profil')
          .select('email')
          .ilike('nama', inputPengguna)
          .maybeSingle();

        if (padanNama?.email) {
          emailUntukLogin = padanNama.email;
        } else {
          const { data: padanPrefix } = await supabase
            .from('admin_profil')
            .select('email')
            .ilike('email', `${inputPengguna}@%`)
            .limit(1);

          if (padanPrefix && padanPrefix.length > 0) {
            emailUntukLogin = padanPrefix[0].email;
          } else {
            throw new Error('Username tidak dijumpai. Sila semak semula atau masukkan alamat e-mel berdaftar.');
          }
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailUntukLogin,
        password
      });

      if (error) {
        throw new Error('Username/e-mel atau kata laluan tidak sah.');
      }

      router.replace(destinasi);
    } catch (err: any) {
      setRalatMesej(err.message || 'Gagal log masuk. Sila cuba lagi.');
    } finally {
      setMemproses(false);
    }
  };

  if (semakSesiAwal) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0b1120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Menyemak pengesahan keselamatan...</p>
      </div>
    );
  }

  const labelPaparan = destinasi.includes('/farmasi')
    ? 'Kaunter Farmasi & Pembayaran'
    : 'Pusat Pentadbir Sistem';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0b1120',
      color: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link
            href="/"
            style={{
              color: '#94a3b8',
              fontSize: '0.84rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <ArrowLeft size={15} /> Kembali ke Menu Utama
          </Link>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '1rem',
          padding: '2rem 1.75rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '0.85rem',
              backgroundColor: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem'
            }}>
              <ShieldCheck size={28} color="#34d399" />
            </div>

            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Pengesahan Keselamatan
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.35rem 0 0 0' }}>
              Sila log masuk untuk mengakses <strong style={{ color: '#38bdf8' }}>{labelPaparan}</strong>
            </p>
          </div>

          {ralatMesej && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              color: '#fca5a5',
              padding: '0.65rem 0.85rem',
              borderRadius: '0.55rem',
              fontSize: '0.8rem',
              marginBottom: '1rem'
            }}>
              {ralatMesej}
            </div>
          )}

          <form onSubmit={tanganiLogMasuk} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Username atau E-mel
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#64748b"
                  style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="cth: admin atau admin@syifalink.com"
                  value={usernameAtauEmail}
                  onChange={(e) => setUsernameAtauEmail(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '0.55rem',
                    padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Kata Laluan (Password)
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={16}
                  color="#64748b"
                  style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan kata laluan"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '0.55rem',
                    padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={memproses}
              style={{
                marginTop: '0.35rem',
                width: '100%',
                padding: '0.72rem',
                backgroundColor: '#059669',
                border: 'none',
                borderRadius: '0.55rem',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: memproses ? 'not-allowed' : 'pointer',
                opacity: memproses ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
              }}
            >
              <LogIn size={17} /> {memproses ? 'Mengesahkan...' : 'Log Masuk Sistem'}
            </button>
          </form>

          <div style={{
            marginTop: '1.25rem',
            paddingTop: '0.9rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.74rem',
            color: '#64748b'
          }}>
            <Lock size={12} /> Kawasan terhad untuk kakitangan &amp; pentadbir bertauliah sahaja
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HalamanLogMasuk() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', backgroundColor: '#0b1120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#94a3b8' }}>Memuatkan skrin log masuk...</p>
        </div>
      }
    >
      <BorangLogMasuk />
    </Suspense>
  );
}