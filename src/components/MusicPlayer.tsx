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
  const hasSearched = loading || results.length > 0 || Boolean(error);

  return (
    <div className="glass flex h-full min-h-0 flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/25">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold">Muzik Player</h3>
            <p className="mt-0.5 truncate text-xs text-white/40">
              YouTube'da ara, cal, haritada gorunsun.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-spotify/20 bg-spotify/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-spotify">
            Online
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-3">
        <form onSubmit={submit} className="flex rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-1.5 shadow-inner shadow-black/20">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sarki, sanatci veya video ara"
            className="min-h-11 min-w-0 flex-1 rounded-2xl bg-transparent px-3 text-sm font-semibold outline-none placeholder:font-medium placeholder:text-white/35"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="min-w-[72px] rounded-2xl bg-spotify px-4 text-sm font-extrabold text-black shadow-lg shadow-spotify/20 transition hover:bg-spotify-dark active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "..." : "Ara"}
          </button>
        </form>

        {error && (
          <div className="rounded-2xl border border-red-400/15 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100">
            {error}
          </div>
        )}

        <div
          className={
            current
              ? "relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl shadow-black/30"
              : "pointer-events-none fixed -left-[9999px] top-0 h-[220px] w-[390px] opacity-0"
          }
        >
          <div className="youtube-player-frame aspect-video min-h-[168px] w-full sm:min-h-[210px]">
            <div id={playerDomId} className="h-full w-full" />
          </div>
        </div>

        {!current && (
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-3.5 shadow-inner shadow-white/[0.03] sm:p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-spotify/25 bg-spotify/10">
                <span className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-spotify" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-white/90">
                  {hasSearched ? "Bir sonuc sec" : "Sarki aramaya basla"}
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-white/45">
                  {hasSearched
                    ? "Secili video burada acilir; dinledigin parca profilinde ve haritada gorunur."
                    : "Arama yaptiktan sonra listeden bir parcayi calabilirsin."}
                </div>
              </div>
            </div>
          </div>
        )}

        {current && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-2.5 shadow-lg shadow-black/20 sm:p-3">
            <div className="flex items-center gap-3">
              {current.albumArt ? (
                <img src={current.albumArt} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-lg shadow-black/30 sm:h-16 sm:w-16" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 sm:h-16 sm:w-16">
                  <span className="ml-0.5 h-0 w-0 border-y-[8px] border-l-[12px] border-y-transparent border-l-white/70" />
                </div>
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
                  className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-black transition hover:bg-spotify"
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

        {results.length > 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-black/10 p-1.5">
            <div className="flex items-center justify-between px-2 pb-1 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                Arama sonuclari
              </span>
              <span className="text-[10px] font-semibold text-white/30">{results.length} sonuc</span>
            </div>
            {results.map((track) => (
              <button
                key={track.id}
                onClick={() => playTrack(track)}
                className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-2 text-left transition ${
                  current?.id === track.id ? "bg-spotify/15 ring-1 ring-spotify/30" : "hover:bg-white/5"
                }`}
              >
                {track.albumArt ? (
                  <img src={track.albumArt} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                    <span className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[10px] border-y-transparent border-l-white/60" />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{track.title}</span>
                  <span className="block truncate text-xs text-white/45">{track.artists}</span>
                </span>
                {current?.id === track.id ? (
                  <span className="shrink-0 rounded-full bg-spotify px-2 py-1 text-[10px] font-extrabold text-black">
                    {playing ? "Caliyor" : "Secili"}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold text-white/45">
                    {track.duration ? fmt(track.duration) : "Cal"}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-6 text-center">
            <div className="max-w-[230px]">
              <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-spotify/40" />
              <div className="text-xs font-bold uppercase tracking-wider text-white/35">
                Henuz sonuc yok
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/40">
                Bir sarki veya sanatci ara; oynatilabilir YouTube sonuclari burada listelenecek.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
