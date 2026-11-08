import Link from 'next/link';

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34d399', margin: '0 0 0.5rem 0' }}>
          SyifaLink
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
          Sistem Pengurusan Rawatan Ruqyah, Farmasi, Inventori & Kewangan
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        width: '100%',
        maxWidth: '900px'
      }}>
        {/* Butang 1: Kiosk Pendaftaran */}
        <Link href="/daftar" style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '1rem',
          padding: '1.5rem',
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          textAlign: 'center',
          transition: 'transform 0.2s, border-color 0.2s'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#34d399', margin: '0 0 0.5rem 0' }}>
            Kiosk Pendaftaran
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Daftar pesakit baharu / ulangan & ambil nombor giliran.
          </p>
        </Link>

        {/* Butang 2: Konsol Perawat */}
        <Link href="/perawat" style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '1rem',
          padding: '1.5rem',
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          textAlign: 'center',
          transition: 'transform 0.2s, border-color 0.2s'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📱</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#38bdf8', margin: '0 0 0.5rem 0' }}>
            Konsol Perawat
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Aplikasi telefon 1-tap ustaz untuk rekod ruqyah & sijil MC.
          </p>
        </Link>

        {/* Butang 3: Kaunter Farmasi */}
        <Link href="/farmasi" style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '1rem',
          padding: '1.5rem',
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          textAlign: 'center',
          transition: 'transform 0.2s, border-color 0.2s'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💊</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f59e0b', margin: '0 0 0.5rem 0' }}>
            Kaunter Farmasi
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Bungkusan ubat, cetak sijil cuti rehat & kutip bayaran.
          </p>
        </Link>

        {/* Butang 4: Skrin TV Dewan */}
        <Link href="/tv" target="_blank" style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '1rem',
          padding: '1.5rem',
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          textAlign: 'center',
          transition: 'transform 0.2s, border-color 0.2s'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📺</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#a78bfa', margin: '0 0 0.5rem 0' }}>
            Skrin TV Dewan
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Paparan giliran & panggilan suara audio automatik dewan.
          </p>
        </Link>

        {/* Butang 5: Papan Pemuka Pentadbir */}
        <Link href="/admin" style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '1rem',
          padding: '1.5rem',
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          textAlign: 'center',
          transition: 'transform 0.2s, border-color 0.2s'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ec4899', margin: '0 0 0.5rem 0' }}>
            Pusat Pentadbir
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Kawalan inventori stok ubat & laporan lejar tunai harian.
          </p>
        </Link>
      </div>
    </main>
  );
}