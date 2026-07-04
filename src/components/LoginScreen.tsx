"use client";

import { useState, type FormEvent } from "react";
import { Globe } from "./Globe";
import type { LocalProfile } from "@/types";

interface Props {
  onConnect: (profile: Omit<LocalProfile, "id">) => Promise<void>;
  configured: boolean;
  error?: string | null;
}

export function LoginScreen({ onConnect, configured, error }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onConnect({ displayName, photoURL });
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

      <div className="relative w-full max-w-lg animate-fade-in">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-spotify">
          <span className="h-2 w-2 animate-pulse rounded-full bg-spotify" />
          Canli · Site ici player
        </div>

        <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-5xl font-extrabold leading-tight text-transparent md:text-7xl">
          Sonar
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-white/60 md:text-lg">
          Profilini olustur, sitedeki player'dan muzik dinle ve dunyadaki diger
          dinleyicilerle ayni haritada gorun.
        </p>

        {configured ? (
          <form onSubmit={submit} className="glass mx-auto mt-8 flex flex-col gap-3 rounded-2xl p-4 text-left">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Kullanici adi
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Orn: R0YC0LD"
              maxLength={40}
              className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-spotify"
            />

            <label className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              Profil fotografi URL'i
            </label>
            <input
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://..."
              className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-spotify"
            />

            <button
              type="submit"
              disabled={!displayName.trim() || submitting}
              className="mt-2 min-h-12 rounded-xl bg-spotify px-7 text-sm font-bold text-black shadow-lg shadow-spotify/30 transition hover:bg-spotify-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Hazirlaniyor..." : "Sisteme gir"}
            </button>
          </form>
        ) : (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-left text-sm text-amber-200">
            <b>Kurulum gerekli.</b> Firebase bilgileri eksik gorunuyor.
          </div>
        )}

        {error && (
          <div className="mx-auto mt-4 max-w-md rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-left text-sm text-red-100">
            {error}
          </div>
        )}

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
