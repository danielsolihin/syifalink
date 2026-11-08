import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');

    if (!text) {
      return new NextResponse('Parameter text diperlukan', { status: 400 });
    }

    // Panggil enjin suara Bahasa Melayu (ms) berkualiti tinggi
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ms&client=tw-ob`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!res.ok) {
      return new NextResponse('Ralat menjana audio', { status: 500 });
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, immutable'
      }
    });
  } catch (error: any) {
    console.error('Ralat API TTS:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}