import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { noTelefon, namaPesakit, noGiliran, namaPerawat, bilik } = body;

    if (!noTelefon || !noGiliran) {
      return NextResponse.json({ success: false, message: 'Maklumat tidak lengkap' }, { status: 400 });
    }

    // Format nombor telefon Malaysia (tukar 01x kepada 601x)
    let phoneFormatted = noTelefon.replace(/[^0-9]/g, '');
    if (phoneFormatted.startsWith('0')) {
      phoneFormatted = '6' + phoneFormatted;
    }

    // Teks Mesej Rasmi SyifaLink
    const mesej = 
`*KLINIK RAWATAN DARUL SYIFA'*
_Pusat Rawatan Islam & Ruqyah Syar'iyyah_

Assalamualaikum w.b.t. *${namaPesakit}*,

Pendaftaran rawatan anda telah berjaya direkodkan:

🎟️ *Nombor Giliran:* *${noGiliran}*
👤 *Perawat:* ${namaPerawat}
📍 *Lokasi:* ${bilik}
⏰ *Masa:* ${new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}

Sila bersedia di ruang menunggu apabila nombor giliran anda dipanggil di skrin.

_Semoga Allah SWT mengurniakan kesembuhan, ketenangan dan 'afiah zahir serta batin._`;

    // Semak jika ada Token Fonnte dalam .env.local
    const fonnteToken = process.env.FONNTE_TOKEN;

    if (fonnteToken) {
      // Hantar sebenar menggunakan Fonnte API
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': fonnteToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phoneFormatted,
          message: mesej,
          countryCode: '60',
        }),
      });

      const result = await res.json();
      return NextResponse.json({ success: true, apiUsed: 'Fonnte', result });
    } else {
      // Mod Simulasi (Jika belum masukkan token Fonnte)
      console.log('--- [SIMULASI WHATSAPP DIHANTAR] ---');
      console.log('Penerima:', phoneFormatted);
      console.log(mesej);
      console.log('------------------------------------');

      return NextResponse.json({
        success: true,
        apiUsed: 'Simulasi (Console Log)',
        phone: phoneFormatted,
        mesej: encodeURIComponent(mesej)
      });
    }

  } catch (error: any) {
    console.error('Ralat API WhatsApp:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}