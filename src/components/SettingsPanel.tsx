"use client";

import type { LastfmProfile, Visibility } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: LastfmProfile | null;
  visibility: Visibility;
  onChangeVisibility: (v: Visibility) => void;
  onRefreshLocation: () => void;
  onDisconnect: () => void;
}

const OPTIONS: { value: Visibility; title: string; desc: string; icon: string }[] = [
  {
    value: "global",
    title: "Global",
    desc: "Herkes seni ve ne dinledigini haritada gorebilir.",
    icon: "🌍",
  },
  {
    value: "friends",
    title: "Sadece Arkadaslar",
    desc: "Yalnizca arkadas olarak ekledigin kisiler gorebilir.",
    icon: "👥",
  },
  {
    value: "off",
    title: "Kapali",
    desc: "Konumun hic paylasilmaz, haritada gorunmezsin.",
    icon: "🔒",
  },
];

export function SettingsPanel({
  open,
  onClose,
  profile,
  visibility,
  onChangeVisibility,
  onRefreshLocation,
  onDisconnect,
}: Props) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`glass fixed right-0 top-0 z-50 flex h-full w-[min(90vw,380px)] flex-col p-6 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Ayarlar</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {profile && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-spotify/20 text-lg">
                {profile.displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold">{profile.displayName}</div>
              <div className="text-xs text-spotify">Last.fm baglantili</div>
            </div>
          </div>
        )}

        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Konum Gizliligi
        </div>
        <div className="flex flex-col gap-2">
          {OPTIONS.map((opt) => {
            const active = visibility === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChangeVisibility(opt.value)}
                className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-spotify bg-spotify/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold">
                    {opt.title}
                    {active && <span className="h-2 w-2 rounded-full bg-spotify" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/50">{opt.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-6">
          <button
            onClick={onRefreshLocation}
            className="rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium transition hover:bg-white/10"
          >
            📍 Konumu yeniden al
          </button>
          <button
            onClick={onDisconnect}
            className="rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
          >
            Baglantiyi kes / Cikis
          </button>
        </div>
      </div>
    </>
  );
}
