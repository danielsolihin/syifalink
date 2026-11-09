// app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');

    if (!text) {
      return new NextResponse('Parameter text diperlukan', { status: 400 });
    }

    const cleanText = text.slice(0, 200).trim();

    // Senarai pembekal TTS Bahasa Melayu (Kalis sekatan pelayan awan)
    const providers = [
      // 1. Google Translate API Gateway (Tidak sekat Vercel)
      `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=ms&q=${encodeURIComponent(cleanText)}`,
      // 2. Google Cloud Wavenet Nusantara Engine (Studio Quality)
      `https://api.streamelements.com/kappa/v2/speech?voice=id-ID-Standard-A&text=${encodeURIComponent(cleanText)}`,
      // 3. Google Translate Web API
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=ms&client=tw-ob`
    ];

    let audioBuffer: ArrayBuffer | null = null;
    let mimeType = 'audio/mpeg';

    for (const url of providers) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/',
            'Accept': 'audio/mpeg, audio/*;q=0.9, */*;q=0.8'
          },
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 400) {
            audioBuffer = buffer;
            mimeType = res.headers.get('content-type') || 'audio/mpeg';
            break;
          }
        }
      } catch (e) {
        // Teruskan ke pembekal seterusnya
      }
    }

    if (!audioBuffer) {
      return new NextResponse('Gagal menjana audio dari semua pembekal', { status: 502 });
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
      }
    });
  } catch (error: any) {
    console.error('Ralat API TTS:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}