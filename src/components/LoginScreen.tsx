"use client";

import { Globe } from "./Globe";

interface Props {
  onConnect: () => void;
  configured: boolean;
}

export function LoginScreen({ onConnect, configured }: Props) {
  return (
    <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40">
        <div className="w-[min(80vw,640px)]">
          <Globe enableZoom={false} speed={0.004} markers={[]} />
        </div>
      </div>

      <div className="relative animate-fade-in">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-spotify">
          <span className="h-2 w-2 animate-pulse rounded-full bg-spotify" />
          Canli · Dunyayi Dinle
        </div>

        <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-5xl font-extrabold leading-tight text-transparent md:text-7xl">
          Sonar
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-white/60 md:text-lg">
          Spotify hesabini bagla, dunyanin dort bir yanindaki insanlarin
          <span className="text-white/90"> su an ne dinlediklerini</span> canli olarak gor.
        </p>

        {configured ? (
          <button
            onClick={onConnect}
            className="group mt-8 inline-flex items-center gap-3 rounded-full bg-spotify px-8 py-4 text-base font-bold text-black shadow-lg shadow-spotify/30 transition hover:scale-105 hover:bg-spotify-dark active:scale-100"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" className="fill-black">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.62.62 0 01-.86.2c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 11-.28-1.22c3.8-.87 7.08-.5 9.72 1.12.3.18.4.57.21.86zm1.23-2.74a.78.78 0 01-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 11-.45-1.5c3.63-1.1 8.15-.56 11.23 1.34.37.22.49.7.26 1.07zm.1-2.85C14.84 8.97 9.4 8.8 6.3 9.74a.94.94 0 11-.54-1.8c3.56-1.08 9.56-.87 13.33 1.36a.94.94 0 01-.96 1.6z" />
            </svg>
            Spotify ile Baglan
          </button>
        ) : (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-left text-sm text-amber-200">
            <b>Kurulum gerekli.</b> Once <code>.env</code> dosyasina Firebase ve Spotify
            bilgilerini girmelisin. Detaylar icin <code>OKUBENI.md</code> dosyasina bak.
          </div>
        )}

        <p className="mx-auto mt-6 max-w-sm text-xs text-white/35">
          Konumun yalnizca senin sectigin gizlilik ayarina gore paylasilir. Istedigin an
          "kapali" yapabilir veya sadece arkadaslarinla paylasabilirsin.
        </p>

        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-white/40">
          <a href={`${import.meta.env.BASE_URL}privacy`} className="transition hover:text-white">
            Gizlilik Politikasi
          </a>
          <span>·</span>
          <a href={`${import.meta.env.BASE_URL}terms`} className="transition hover:text-white">
            Kullanim Sartlari
          </a>
        </div>
      </div>
    </div>
  );
}
