"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { searchTracks } from "@/lib/musicSearch";
import type { NowPlaying, PlayableTrack } from "@/types";

interface Props {
  onNowPlaying: (track: NowPlaying | null) => Promise<void>;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toNowPlaying(track: PlayableTrack, progress: number, isPlaying: boolean): NowPlaying {
  return {
    id: track.id,
    title: track.title,
    artists: track.artists,
    album: track.album,
    albumArt: track.albumArt,
    duration: track.duration,
    progress,
    isPlaying,
    trackUrl: track.trackUrl,
    updatedAt: Date.now(),
  };
}

export function MusicPlayer({ onNowPlaying }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSyncRef = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayableTrack[]>([]);
  const [current, setCurrent] = useState<PlayableTrack | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term || loading) return;
    setLoading(true);
    setError(null);
    try {
      const tracks = await searchTracks(term);
      setResults(tracks);
      if (tracks.length === 0) setError("Bu arama icin calinabilir sonuc bulunamadi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arama basarisiz oldu.");
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (track: PlayableTrack) => {
    setCurrent(track);
    setProgress(0);
    setDuration(track.duration);
    await onNowPlaying(toNowPlaying(track, 0, true));
    window.setTimeout(() => {
      audioRef.current?.play().catch(() => {
        setError("Tarayici calmayi engelledi. Tekrar play'e bas.");
      });
    }, 0);
  };

  const toggle = async () => {
    if (!audioRef.current || !current) return;
    if (audioRef.current.paused) {
      await audioRef.current.play();
      await onNowPlaying(toNowPlaying(current, Math.floor(audioRef.current.currentTime), true));
    } else {
      audioRef.current.pause();
      await onNowPlaying(toNowPlaying(current, Math.floor(audioRef.current.currentTime), false));
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    const onLoaded = () => setDuration(Math.round(audio.duration || current.duration || 30));
    const onTime = () => {
      const sec = Math.floor(audio.currentTime || 0);
      setProgress(sec);
      const now = Date.now();
      if (now - lastSyncRef.current > 2500) {
        lastSyncRef.current = now;
        onNowPlaying(toNowPlaying(current, sec, !audio.paused)).catch(() => {});
      }
    };
    const onPause = () => onNowPlaying(toNowPlaying(current, Math.floor(audio.currentTime || 0), false));
    const onPlay = () => onNowPlaying(toNowPlaying(current, Math.floor(audio.currentTime || 0), true));
    const onEnded = () => onNowPlaying(toNowPlaying(current, Math.floor(audio.currentTime || 0), false));

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("ended", onEnded);
    };
  }, [current, onNowPlaying]);

  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-bold">Sonar Player</h3>
        <p className="mt-0.5 text-xs text-white/40">Ara, cal, herkes ne dinledigini gorsun.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sarki, sanatci veya album ara"
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-white/35 focus:border-spotify"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="rounded-xl bg-spotify px-4 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? "..." : "Ara"}
          </button>
        </form>

        {error && <div className="mt-2 rounded-xl bg-red-500/10 p-2 text-xs text-red-100">{error}</div>}

        {current && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex gap-3">
              {current.albumArt ? (
                <img src={current.albumArt} alt="" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10">♪</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{current.title}</div>
                <div className="truncate text-xs text-white/55">{current.artists}</div>
                <button
                  onClick={toggle}
                  className="mt-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black"
                >
                  {audioRef.current?.paused === false ? "Duraklat" : "Cal"}
                </button>
              </div>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-spotify" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/45">
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
        )}

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {results.map((track) => (
            <button
              key={track.id}
              onClick={() => playTrack(track)}
              className="mb-1 flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5"
            >
              {track.albumArt ? (
                <img src={track.albumArt} alt="" className="h-11 w-11 rounded-lg object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">♪</div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{track.title}</span>
                <span className="block truncate text-xs text-white/45">{track.artists}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <audio ref={audioRef} src={current?.previewUrl} preload="metadata" />
    </div>
  );
}
