"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { searchTracks } from "@/lib/musicSearch";
import type { NowPlaying, PlayableTrack } from "@/types";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface Props {
  onNowPlaying: (track: NowPlaying | null) => Promise<void>;
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector("script[src='https://www.youtube.com/iframe_api']")) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return youtubeApiPromise;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toNowPlaying(track: PlayableTrack, progress: number, duration: number, isPlaying: boolean): NowPlaying {
  return {
    id: track.id,
    title: track.title,
    artists: track.artists,
    album: track.album,
    albumArt: track.albumArt,
    duration,
    progress,
    isPlaying,
    trackUrl: track.trackUrl,
    updatedAt: Date.now(),
  };
}

export function MusicPlayer({ onNowPlaying }: Props) {
  const playerDomId = useId().replace(/:/g, "");
  const playerRef = useRef<any>(null);
  const currentRef = useRef<PlayableTrack | null>(null);
  const resultsRef = useRef<PlayableTrack[]>([]);
  const failedIdsRef = useRef<Set<string>>(new Set());
  const lastSyncRef = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayableTrack[]>([]);
  const [current, setCurrent] = useState<PlayableTrack | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  resultsRef.current = results;

  const loadTrack = async (track: PlayableTrack, options?: { resetFailures?: boolean; auto?: boolean }) => {
    if (!ready || !playerRef.current) {
      setError("YouTube player henuz hazir degil. Bir saniye sonra tekrar dene.");
      return;
    }
    if (options?.resetFailures) failedIdsRef.current.clear();
    currentRef.current = track;
    setCurrent(track);
    setProgress(0);
    setDuration(track.duration || 0);
    setPlaying(true);
    setError(options?.auto ? "Onceki video oynatilamadi, uygun sonraki sonuc deneniyor." : null);
    playerRef.current.loadVideoById(track.videoId);
    await onNowPlaying(toNowPlaying(track, 0, track.duration || 0, true));
  };

  const playNextAvailable = () => {
    const currentId = currentRef.current?.id;
    if (currentId) failedIdsRef.current.add(currentId);
    const next = resultsRef.current.find((track) => !failedIdsRef.current.has(track.id));
    if (next) {
      currentRef.current = next;
      setCurrent(next);
      setProgress(0);
      setDuration(next.duration || 0);
      setPlaying(true);
      setError("Onceki video oynatilamadi, uygun sonraki sonuc deneniyor.");
      playerRef.current?.loadVideoById(next.videoId);
      onNowPlaying(toNowPlaying(next, 0, next.duration || 0, true)).catch(() => {});
    } else {
      setPlaying(false);
      setError("Bu aramadaki YouTube sonuclari gomulu oynatmaya izin vermedi. Daha spesifik bir arama dene.");
      onNowPlaying(null).catch(() => {});
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || playerRef.current) return;
      playerRef.current = new window.YT.Player(playerDomId, {
        width: "100%",
        height: "220",
        playerVars: {
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (event: any) => {
            const track = currentRef.current;
            if (!track || !playerRef.current) return;
            const state = event.data;
            const isPlaying = state === window.YT.PlayerState.PLAYING;
            const isPaused =
              state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.ENDED;
            if (isPlaying || isPaused) {
              const sec = Math.floor(playerRef.current.getCurrentTime?.() || 0);
              const total = Math.floor(playerRef.current.getDuration?.() || 0);
              setPlaying(isPlaying);
              setProgress(sec);
              setDuration(total);
              onNowPlaying(toNowPlaying(track, sec, total, isPlaying)).catch(() => {});
            }
          },
          onError: () => playNextAvailable(),
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [onNowPlaying, playerDomId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!playerRef.current || !currentRef.current) return;
      const sec = Math.floor(playerRef.current.getCurrentTime?.() || 0);
      const total = Math.floor(playerRef.current.getDuration?.() || 0);
      setProgress(sec);
      setDuration(total);
      const now = Date.now();
      if (now - lastSyncRef.current > 2500) {
        lastSyncRef.current = now;
        onNowPlaying(toNowPlaying(currentRef.current, sec, total, playing)).catch(() => {});
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [onNowPlaying, playing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term || loading) return;
    setLoading(true);
    setError(null);
    try {
      const tracks = await searchTracks(term);
      setResults(tracks);
      failedIdsRef.current.clear();
      if (tracks.length === 0) setError("Bu arama icin YouTube sonucu bulunamadi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arama basarisiz oldu.");
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (track: PlayableTrack) => {
    await loadTrack(track, { resetFailures: true });
  };

  const toggle = async () => {
    if (!playerRef.current || !currentRef.current) return;
    if (playing) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="glass flex h-full min-h-0 flex-col overflow-hidden rounded-2xl shadow-2xl">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold">YouTube Player</h3>
            <p className="mt-0.5 truncate text-xs text-white/40">
              Ara, cal, haritada ne dinledigin gorunsun.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-200">
            Live
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <form onSubmit={submit} className="flex rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sarki, sanatci veya video ara"
            className="min-h-10 min-w-0 flex-1 rounded-xl bg-transparent px-3 text-sm font-medium outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="rounded-xl bg-spotify px-4 text-sm font-bold text-black shadow-lg shadow-spotify/20 transition hover:bg-spotify-dark active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "..." : "Ara"}
          </button>
        </form>

        {error && (
          <div className="rounded-2xl border border-red-400/15 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100">
            {error}
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl shadow-black/30">
          {!current && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_center,rgba(29,185,84,0.16),transparent_58%),#090910] text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl">
                ▶
              </div>
              <div className="text-sm font-bold text-white/80">Bir sarki ara ve cal</div>
              <div className="max-w-[220px] text-xs text-white/40">
                YouTube player burada acilir.
              </div>
            </div>
          )}
          <div className="youtube-player-frame aspect-video min-h-[210px] w-full">
            <div id={playerDomId} className="h-full w-full" />
          </div>
        </div>

        {current && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              {current.albumArt ? (
                <img src={current.albumArt} alt="" className="h-16 w-16 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">▶</div>
              )}
              <div className="min-w-0 flex-1 self-stretch">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{current.title}</div>
                    <div className="truncate text-xs text-white/55">{current.artists}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/55">
                    YouTube
                  </span>
                </div>
                <button
                  onClick={toggle}
                  className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black transition hover:bg-spotify"
                >
                  {playing ? "Duraklat" : "Cal"}
                </button>
              </div>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-spotify" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/45">
              <span>{fmt(progress)}</span>
              <span>{duration ? fmt(duration) : "--:--"}</span>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-black/10 p-1.5">
          {results.length > 0 && (
            <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Arama sonuclari
            </div>
          )}
          {results.map((track) => (
            <button
              key={track.id}
              onClick={() => playTrack(track)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${
                current?.id === track.id ? "bg-spotify/15 ring-1 ring-spotify/30" : "hover:bg-white/5"
              }`}
            >
              {track.albumArt ? (
                <img src={track.albumArt} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">▶</div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{track.title}</span>
                <span className="block truncate text-xs text-white/45">{track.artists}</span>
              </span>
              {current?.id === track.id && (
                <span className="shrink-0 rounded-full bg-spotify px-2 py-1 text-[10px] font-bold text-black">
                  {playing ? "Calıyor" : "Secili"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
