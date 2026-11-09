// app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');

    if (!text) {
      return new NextResponse('Parameter text diperlukan', { status: 400 });
    }

    const cleanText = text.slice(0, 180);

    // Senarai endpoint Google TTS rasmi (Bahasa Melayu & sandaran serumpun)
    const targets = [
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=ms&client=tw-ob`,
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=id&client=tw-ob`
    ];

    let audioBuffer: ArrayBuffer | null = null;

    for (const url of targets) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/',
            'Accept': 'audio/mpeg, audio/*;q=0.9, */*;q=0.8'
          },
          cache: 'no-store'
        });

        if (res.ok) {
          audioBuffer = await res.arrayBuffer();
          break;
        }
      } catch (err) {
        console.error('Percubaan fetch TTS gagal:', err);
      }
    }

    if (!audioBuffer) {
      return new NextResponse('Ralat menjana audio dari pelayan', { status: 502 });
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
      }
    });
  } catch (error: any) {
    console.error('Ralat API TTS:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}