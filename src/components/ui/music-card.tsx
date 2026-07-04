"use client";

import { useEffect, useState } from "react";

export interface Song {
  title: string;
  artists: string;
  album?: string;
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

interface MusicCardProps {
  songs: Song[];
  /** true ise sarki listesini otomatik degistirir (demo). */
  autoRotate?: boolean;
  className?: string;
}

export function MusicCard({ songs, autoRotate = false, className = "" }: MusicCardProps) {
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
  const hasTimeline = song.duration > 0;

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
        <span className="shrink-0 rounded-full bg-spotify/15 px-2 py-1 text-[11px] font-bold text-spotify">
          fm
        </span>
      </div>

      {hasTimeline ? (
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
      ) : (
        <div className="mt-3 rounded-full bg-white/10 px-3 py-2 text-center text-[12px] font-medium text-white/55">
          {(song.isPlaying ?? false) ? "Last.fm'e gore su an dinleniyor" : "Last.fm'de son dinlenen"}
        </div>
      )}

      <style>{`@keyframes eq { from { height: 4px } to { height: 14px } }`}</style>
    </div>
  );
}

export default MusicCard;
