import type { LastfmProfile, NowPlaying } from "@/types";

const API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
const API_ENDPOINT = "https://ws.audioscrobbler.com/2.0/";
const LS_KEY = "sonar_lastfm_user";

export const isLastfmConfigured = Boolean(API_KEY);

export class LastfmApiError extends Error {
  code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = "LastfmApiError";
    this.code = code;
  }
}

function normalizeUsername(username: string): string {
  return username.trim();
}

function getLargestImage(images: any[] | undefined): string {
  if (!Array.isArray(images)) return "";
  const image = [...images].reverse().find((img) => img?.["#text"]);
  return image?.["#text"] || "";
}

async function requestLastfm<T>(params: Record<string, string>): Promise<T> {
  if (!API_KEY) {
    throw new LastfmApiError("Last.fm API key eksik. .env dosyasina VITE_LASTFM_API_KEY eklemelisin.");
  }

  const qs = new URLSearchParams({
    ...params,
    api_key: API_KEY,
    format: "json",
  });

  const res = await fetch(`${API_ENDPOINT}?${qs.toString()}`);
  if (!res.ok) {
    throw new LastfmApiError("Last.fm servisine ulasilamadi. Lutfen biraz sonra tekrar dene.");
  }

  const data = await res.json();
  if (data?.error) {
    const message =
      data.error === 6 || data.error === 7
        ? "Bu Last.fm kullanicisi bulunamadi veya dinleme gecmisi herkese acik degil."
        : data.message || "Last.fm istegi basarisiz oldu.";
    throw new LastfmApiError(message, data.error);
  }

  return data as T;
}

export function saveLastfmUser(username: string) {
  localStorage.setItem(LS_KEY, normalizeUsername(username));
}

export function clearLastfmSession() {
  localStorage.removeItem(LS_KEY);
}

export function getLastfmUser(): string | null {
  const username = localStorage.getItem(LS_KEY);
  return username ? normalizeUsername(username) : null;
}

export function hasLastfmSession(): boolean {
  return getLastfmUser() !== null;
}

export async function connectLastfm(username: string): Promise<LastfmProfile> {
  const profile = await fetchLastfmProfile(username);
  saveLastfmUser(profile.username);
  return profile;
}

export async function fetchLastfmProfile(username = getLastfmUser() || ""): Promise<LastfmProfile> {
  const user = normalizeUsername(username);
  if (!user) {
    throw new LastfmApiError("Last.fm kullanici adini girmelisin.");
  }

  const data = await requestLastfm<{ user: any }>({
    method: "user.getinfo",
    user,
  });

  const info = data.user;
  return {
    id: info.name,
    username: info.name,
    displayName: info.realname || info.name,
    photoURL: getLargestImage(info.image),
    profileURL: info.url || `https://www.last.fm/user/${encodeURIComponent(info.name)}`,
  };
}

export async function fetchNowPlaying(username = getLastfmUser() || ""): Promise<NowPlaying | null> {
  const user = normalizeUsername(username);
  if (!user) return null;

  const data = await requestLastfm<{ recenttracks: { track?: any[] | any } }>({
    method: "user.getrecenttracks",
    user,
    limit: "1",
    extended: "1",
  });

  const rawTrack = data.recenttracks?.track;
  const track = Array.isArray(rawTrack) ? rawTrack[0] : rawTrack;
  if (!track) return null;

  const isPlaying = track["@attr"]?.nowplaying === "true";
  const artist = typeof track.artist === "string" ? track.artist : track.artist?.name || track.artist?.["#text"];
  const album = typeof track.album === "string" ? track.album : track.album?.["#text"];

  return {
    title: track.name || "Bilinmeyen sarki",
    artists: artist || "Bilinmeyen sanatci",
    album: album || "",
    albumArt: getLargestImage(track.image),
    duration: 0,
    progress: 0,
    isPlaying,
    trackUrl: track.url,
    updatedAt: Date.now(),
  };
}
