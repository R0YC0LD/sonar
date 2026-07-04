"use client";

import { useEffect, useState } from "react";

export interface Song {
  title: string;
  artists: string;
  duration: number; // saniye
  albumArt: string;
  progress?: number; // saniye (opsiyonel baslangic)
  isPlaying?: boolean;
  trackUrl?: string;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SpotifyCardProps {
  songs: Song[];
  /** true ise sarki listesini otomatik degistirir (demo). */
  autoRotate?: boolean;
  className?: string;
}

export function SpotifyCard({ songs, autoRotate = false, className = "" }: SpotifyCardProps) {
  const [index, setIndex] = useState(0);
  const song = songs[index % songs.length] ?? songs[0];
  const [progress, setProgress] = useState(song?.progress ?? 0);

  // sarki degisince ilerlemeyi sifirla
  useEffect(() => {
    setProgress(song?.progress ?? 0);
  }, [song]);

  // ilerleme cubugu tik tik ilerlesin (sadece caliyorsa)
  useEffect(() => {
    if (!song) return;
    const playing = song.isPlaying ?? true;
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= song.duration) {
          if (autoRotate) setIndex((i) => (i + 1) % songs.length);
          return autoRotate ? 0 : song.duration;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [song, autoRotate, songs.length]);

  if (!song) return null;
  const pct = song.duration ? Math.min(100, (progress / song.duration) * 100) : 0;

  return (
    <div
      className={`glass w-[300px] overflow-hidden rounded-2xl p-4 shadow-2xl ${className}`}
      style={{ background: "linear-gradient(160deg, rgba(20,32,24,0.85), rgba(10,12,18,0.9))" }}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl">
        {song.albumArt ? (
          <img
            src={song.albumArt}
            alt={song.title}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5 text-4xl">🎵</div>
        )}
        {(song.isPlaying ?? true) && (
          <div className="absolute bottom-2 right-2 flex items-end gap-[3px] rounded-full bg-black/50 px-2 py-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-spotify"
                style={{
                  height: 12,
                  animation: `eq 0.9s ease-in-out ${i * 0.12}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <a
            href={song.trackUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-[15px] font-bold text-white hover:underline"
          >
            {song.title}
          </a>
          <div className="truncate text-[13px] text-white/60">{song.artists}</div>
        </div>
        <svg viewBox="0 0 24 24" width="22" height="22" className="shrink-0 fill-spotify">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.62.62 0 01-.86.2c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 11-.28-1.22c3.8-.87 7.08-.5 9.72 1.12.3.18.4.57.21.86zm1.23-2.74a.78.78 0 01-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 11-.45-1.5c3.63-1.1 8.15-.56 11.23 1.34.37.22.49.7.26 1.07zm.1-2.85C14.84 8.97 9.4 8.8 6.3 9.74a.94.94 0 11-.54-1.8c3.56-1.08 9.56-.87 13.33 1.36a.94.94 0 01-.96 1.6z" />
        </svg>
      </div>

      {/* ilerleme cubugu */}
      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${pct}%`, transition: "width 1s linear" }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/50">
          <span>{fmt(progress)}</span>
          <span>{fmt(song.duration)}</span>
        </div>
      </div>

      <style>{`@keyframes eq { from { height: 4px } to { height: 14px } }`}</style>
    </div>
  );
}

export default SpotifyCard;
