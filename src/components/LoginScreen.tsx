"use client";

import { useState, type FormEvent } from "react";
import { Globe } from "./Globe";
import type { LoginInput, RegisterInput } from "@/types";

interface Props {
  onLogin: (input: LoginInput) => Promise<void>;
  onRegister: (input: RegisterInput) => Promise<void>;
  configured: boolean;
  error?: string | null;
}

type Mode = "login" | "register";

export function LoginScreen({ onLogin, onRegister, configured, error }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";
  const canSubmit = email.trim() && password.length >= 6 && (!isRegister || displayName.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (isRegister) {
        await onRegister({ displayName, email, password });
      } else {
        await onLogin({ email, password });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-4 py-7 text-center sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-35">
        <div className="w-[min(92vw,640px)]">
          <Globe enableZoom={false} speed={0.004} markers={[]} />
        </div>
      </div>

      <div className="relative w-full max-w-lg animate-fade-in">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-spotify">
          <span className="h-2 w-2 animate-pulse rounded-full bg-spotify" />
          Canli · Site ici player
        </div>

        <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-5xl font-extrabold leading-tight text-transparent sm:text-6xl md:text-7xl">
          Sonar
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60 sm:text-base md:text-lg">
          Hesabinla giris yap, muzik dinle ve dinleyicileri ayni haritada gor.
        </p>

        {configured ? (
          <form onSubmit={submit} className="glass mx-auto mt-7 flex flex-col gap-3 rounded-2xl p-3 text-left shadow-2xl shadow-black/25 sm:p-4">
            <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              {(["login", "register"] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                    mode === item ? "bg-spotify text-black" : "text-white/50 hover:text-white"
                  }`}
                >
                  {item === "login" ? "Giris" : "Kayit"}
                </button>
              ))}
            </div>

            {isRegister && (
              <>
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
              </>
            )}

            <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
              E-posta
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="ornek@mail.com"
              className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-spotify"
            />

            <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Sifre
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="En az 6 karakter"
              className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-spotify"
            />

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="mt-1 min-h-12 rounded-xl bg-spotify px-7 text-sm font-bold text-black shadow-lg shadow-spotify/30 transition hover:bg-spotify-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Hazirlaniyor..." : isRegister ? "Hesap olustur" : "Giris yap"}
            </button>

            <p className="px-1 text-center text-xs leading-relaxed text-white/40">
              Profil fotografini girdikten sonra ayarlardan cihazindan yukleyebilirsin.
            </p>
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
