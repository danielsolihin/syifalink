'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './login.module.css';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [kataLaluan, setKataLaluan] = useState('');
  const [ralat, setRalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  const tanganiLogMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setRalat(null);
    setMemproses(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: kataLaluan,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        router.push('/admin');
      }
    } catch (err: any) {
      setRalat('E-mel atau kata laluan tidak sah. Sila cuba lagi.');
    } finally {
      setMemproses(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.headerArea}>
          <h1 className={styles.brandTitle}>
            <ShieldCheck size={28} /> Pentadbir SyifaLink
          </h1>
          <p className={styles.brandSub}>Sila log masuk untuk mengakses pusat kawalan</p>
        </div>

        {ralat && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{ralat}</span>
          </div>
        )}

        <form onSubmit={tanganiLogMasuk}>
          <div className={styles.formGroup}>
            <label className={styles.label}>E-mel Pentadbir</label>
            <input
              type="email"
              required
              placeholder="admin@syifalink.com"
              className={styles.inputField}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Kata Laluan</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className={styles.inputField}
              value={kataLaluan}
              onChange={(e) => setKataLaluan(e.target.value)}
            />
          </div>

          <button type="submit" disabled={memproses} className={styles.submitBtn}>
            <LogIn size={18} />
            <span>{memproses ? 'Menyemak Pengesahan...' : 'Log Masuk'}</span>
          </button>
        </form>

        <div className={styles.footerLink}>
          <Link href="/" className={styles.linkText}>
            ← Kembali ke Menu Utama
          </Link>
        </div>
      </div>
    </div>
  );
}