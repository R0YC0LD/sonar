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
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-bold">YouTube Player</h3>
        <p className="mt-0.5 text-xs text-white/40">YouTube'da ara, cal, herkes ne dinledigini gorsun.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sarki, sanatci veya video ara"
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

        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <div id={playerDomId} className="aspect-video w-full min-h-[200px]" />
        </div>

        {current && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex gap-3">
              {current.albumArt ? (
                <img src={current.albumArt} alt="" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">▶</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{current.title}</div>
                <div className="truncate text-xs text-white/55">{current.artists}</div>
                <button
                  onClick={toggle}
                  className="mt-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black"
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
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">▶</div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{track.title}</span>
                <span className="block truncate text-xs text-white/45">{track.artists}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
