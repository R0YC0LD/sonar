import type { NowPlaying, SpotifyProfile } from "@/types";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const LS_KEY = "sonar_spotify_tokens";

interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms epoch
}

export const isSpotifyConfigured = Boolean(CLIENT_ID);

/* ----------------------- PKCE yardimcilari ----------------------- */

function randomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
}

function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/* ----------------------- Token deposu ----------------------- */

function saveTokens(t: TokenBundle) {
  localStorage.setItem(LS_KEY, JSON.stringify(t));
}

function loadTokens(): TokenBundle | null {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? (JSON.parse(raw) as TokenBundle) : null;
}

export function clearSpotifySession() {
  localStorage.removeItem(LS_KEY);
}

export function hasSpotifySession(): boolean {
  return loadTokens() !== null;
}

/* ----------------------- Giris akisi ----------------------- */

export async function beginSpotifyLogin() {
  const verifier = randomString(64);
  const challenge = base64url(await sha256(verifier));
  const state = randomString(16);

  sessionStorage.setItem("spotify_verifier", verifier);
  sessionStorage.setItem("spotify_state", state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });

  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * /callback sayfasinda cagrilir. URL'deki "code" ile access token alir.
 */
export async function completeSpotifyLogin(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verifier = sessionStorage.getItem("spotify_verifier");
  const savedState = sessionStorage.getItem("spotify_state");

  if (!code || !verifier || state !== savedState) return false;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return false;
  const data = await res.json();
  saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  sessionStorage.removeItem("spotify_verifier");
  sessionStorage.removeItem("spotify_state");
  return true;
}

async function refreshAccessToken(bundle: TokenBundle): Promise<TokenBundle | null> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: bundle.refreshToken,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const next: TokenBundle = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? bundle.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  saveTokens(next);
  return next;
}

async function getValidToken(): Promise<string | null> {
  let bundle = loadTokens();
  if (!bundle) return null;
  if (Date.now() > bundle.expiresAt - 60_000) {
    bundle = await refreshAccessToken(bundle);
    if (!bundle) {
      clearSpotifySession();
      return null;
    }
  }
  return bundle.accessToken;
}

/* ----------------------- API cagrilari ----------------------- */

export async function fetchSpotifyProfile(): Promise<SpotifyProfile | null> {
  const token = await getValidToken();
  if (!token) return null;
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    id: data.id,
    displayName: data.display_name || data.id,
    photoURL: data.images?.[0]?.url || "",
  };
}

/**
 * Su an calan sarkiyi dondurur. Hicbir sey calmiyorsa null.
 */
export async function fetchNowPlaying(): Promise<NowPlaying | null> {
  const token = await getValidToken();
  if (!token) return null;

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 204 = hicbir sey calmiyor
  if (res.status === 204 || res.status > 400) return null;
  if (!res.ok) return null;

  const data = await res.json();
  if (!data || !data.item) return null;

  const item = data.item;
  return {
    title: item.name,
    artists: (item.artists || []).map((a: any) => a.name).join(", "),
    albumArt: item.album?.images?.[0]?.url || "",
    duration: Math.round((item.duration_ms || 0) / 1000),
    progress: Math.round((data.progress_ms || 0) / 1000),
    isPlaying: Boolean(data.is_playing),
    trackUrl: item.external_urls?.spotify,
    updatedAt: Date.now(),
  };
}
