import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { nama, email, password, peranan } = await request.json();

    if (!nama || !email || !password || !peranan) {
      return NextResponse.json({ ralat: 'Semua maklumat wajib diisi.' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { ralat: 'Kunci SUPABASE_SERVICE_ROLE_KEY belum ditetapkan dalam fail .env.local.' },
        { status: 500 }
      );
    }

    // Cipta client dengan hak kuasa penuh pentadbir (Service Role)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Cipta akaun pengguna terus aktif (email_confirm: true)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        nama: nama.trim(),
        peranan: peranan
      }
    });

    if (userError) {
      throw userError;
    }

    // 2. Rekod ke dalam jadual profil admin
    if (userData.user) {
      const { error: profilError } = await supabaseAdmin
        .from('admin_profil')
        .insert({
          id: userData.user.id,
          nama: nama.trim(),
          email: email.trim(),
          peranan: peranan
        });

      if (profilError) {
        throw profilError;
      }
    }

    return NextResponse.json({ mesej: `Pentadbir ${nama} berjaya didaftarkan!` });
  } catch (error: any) {
    return NextResponse.json({ ralat: error.message }, { status: 500 });
  }
}