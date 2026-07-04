"use client";

import { useState, type FormEvent } from "react";
import { Globe } from "./Globe";

interface Props {
  onConnect: (username: string) => Promise<void>;
  configured: boolean;
  error?: string | null;
}

export function LoginScreen({ onConnect, configured, error }: Props) {
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = username.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      await onConnect(value);
    } finally {
      setSubmitting(false);
    }
  };

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
          Last.fm kullanici adini gir, dunyanin dort bir yanindaki insanlarin
          <span className="text-white/90"> su an ne dinlediklerini</span> canli olarak gor.
        </p>

        {configured ? (
          <form onSubmit={submit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Last.fm kullanici adi"
              autoComplete="username"
              className="glass min-h-12 flex-1 rounded-full px-5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-spotify"
            />
            <button
              type="submit"
              disabled={!username.trim() || submitting}
              className="min-h-12 rounded-full bg-spotify px-7 text-sm font-bold text-black shadow-lg shadow-spotify/30 transition hover:scale-105 hover:bg-spotify-dark active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? "Kontrol ediliyor..." : "Last.fm ile Baglan"}
            </button>
          </form>
        ) : (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-left text-sm text-amber-200">
            <b>Kurulum gerekli.</b> Once <code>.env</code> dosyasina Firebase ve Last.fm
            bilgilerini girmelisin. Detaylar icin <code>OKUBENI.md</code> dosyasina bak.
          </div>
        )}

        {error && (
          <div className="mx-auto mt-4 max-w-md rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-left text-sm text-red-100">
            {error}
          </div>
        )}

        <p className="mx-auto mt-6 max-w-sm text-xs text-white/35">
          Spotify dinlemelerini gormek icin Last.fm hesabinda Spotify scrobbling'i acik olmali.
          Konumun yalnizca sectigin gizlilik ayarina gore paylasilir.
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
