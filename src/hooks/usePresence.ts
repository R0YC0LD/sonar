import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db, ensureAnonymousAuth, isFirebaseConfigured } from "@/lib/firebase";
import {
  beginSpotifyLogin,
  clearSpotifySession,
  fetchNowPlaying,
  fetchSpotifyProfile,
  hasSpotifySession,
  isSpotifyConfigured,
  SpotifyApiError,
} from "@/lib/spotify";
import { resolveLocation } from "@/lib/geo";
import type { NowPlaying, SpotifyProfile, UserDoc, Visibility } from "@/types";

const POLL_MS = 20_000; // her 20 sn'de bir "su an caliyor" guncelle
const ACTIVE_WINDOW_MS = 5 * 60_000; // son 5 dk aktif olanlar haritada
const VIS_KEY = "sonar_visibility";

export interface PresenceState {
  ready: boolean;
  loading: boolean;
  error: string | null;
  configured: boolean;
  uid: string | null;
  profile: SpotifyProfile | null;
  connected: boolean;
  visibility: Visibility;
  users: UserDoc[]; // haritada gosterilecekler (kendisi haric, filtrelenmis)
  me: UserDoc | null;
  friends: string[];
  connectSpotify: () => void;
  disconnect: () => Promise<void>;
  changeVisibility: (v: Visibility) => Promise<void>;
  toggleFriend: (uid: string) => Promise<void>;
  refreshLocation: () => Promise<void>;
}

export function usePresence(): PresenceState {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [connected, setConnected] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(
    (localStorage.getItem(VIS_KEY) as Visibility) || "global"
  );
  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);
  const [friends, setFriends] = useState<string[]>([]);

  const configured = isFirebaseConfigured && isSpotifyConfigured;
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const placeRef = useRef<{ city?: string; country?: string }>({});
  const nowPlayingRef = useRef<NowPlaying | null>(null);
  const visibilityRef = useRef<Visibility>(visibility);
  visibilityRef.current = visibility;

  /* ---------- 1) Firebase anonim giris ---------- */
  useEffect(() => {
    if (!configured) {
      setLoading(false);
      setReady(true);
      return;
    }
    let mounted = true;
    ensureAnonymousAuth()
      .then((user) => {
        if (!mounted) return;
        setUid(user.uid);
        setConnected(hasSpotifySession());
        setReady(true);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError("Firebase baglantisi kurulamadi: " + e.message);
        setLoading(false);
        setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [configured]);

  /* ---------- 2) Tum kullanicilari dinle ---------- */
  useEffect(() => {
    if (!configured || !uid) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserDoc[] = [];
      snap.forEach((d) => list.push(d.data() as UserDoc));
      setAllUsers(list);
    });
    return () => unsub();
  }, [configured, uid]);

  /* ---------- 3) Arkadas listemi dinle ---------- */
  useEffect(() => {
    if (!configured || !uid) return;
    const unsub = onSnapshot(doc(db, "friendships", uid), (d) => {
      setFriends((d.data()?.friends as string[]) || []);
    });
    return () => unsub();
  }, [configured, uid]);

  /* ---------- 4) Spotify profilini yukle ---------- */
  useEffect(() => {
    if (!connected) {
      setProfile(null);
      return;
    }
    fetchSpotifyProfile()
      .then((p) => {
        if (p) {
          setError(null);
          setProfile(p);
        } else {
          clearSpotifySession();
          setConnected(false);
        }
      })
      .catch((e) => {
        clearSpotifySession();
        setConnected(false);
        setProfile(null);
        if (e instanceof SpotifyApiError) {
          setError(e.message);
        } else {
          setError("Spotify baglantisi tamamlanamadi. Lutfen tekrar dene.");
        }
      });
  }, [connected]);

  /* ---------- 5) Konumu coz ---------- */
  const refreshLocation = useCallback(async () => {
    const loc = await resolveLocation();
    if (loc) {
      locationRef.current = { lat: loc.lat, lng: loc.lng };
      placeRef.current = { city: loc.city, country: loc.country };
    }
  }, []);

  useEffect(() => {
    if (connected) refreshLocation();
  }, [connected, refreshLocation]);

  /* ---------- 6) Firestore'a yaz + now-playing poll ---------- */
  const writeMe = useCallback(async () => {
    if (!uid || !profile) return;
    const vis = visibilityRef.current;
    const payload: UserDoc = {
      uid,
      spotifyId: profile.id,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      city: placeRef.current.city,
      country: placeRef.current.country,
      // "off" secilince konum HIC yazilmaz (gizlilik)
      location: vis === "off" ? null : locationRef.current,
      visibility: vis,
      nowPlaying: nowPlayingRef.current,
      lastActive: Date.now(),
    };
    // Firestore "undefined" degerleri kabul etmez; JSON turu ile temizle.
    const clean = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, "users", uid), clean, { merge: true });
  }, [uid, profile]);

  useEffect(() => {
    if (!configured || !uid || !profile) return;
    let stop = false;

    const tick = async () => {
      if (stop) return;
      nowPlayingRef.current = await fetchNowPlaying();
      if (!locationRef.current) await refreshLocation();
      await writeMe();
    };

    tick();
    const id = setInterval(tick, POLL_MS);

    // sekme kapaninca son aktifligi eskit (haritadan dus)
    const onUnload = () => {
      if (uid) {
        const stale = { lastActive: Date.now() - ACTIVE_WINDOW_MS - 1000 };
        // navigator.sendBeacon Firestore icin uygun degil; best-effort update
        updateDoc(doc(db, "users", uid), stale).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [configured, uid, profile, writeMe, refreshLocation]);

  /* ---------- Aksiyonlar ---------- */
  const connectSpotify = useCallback(() => {
    setError(null);
    beginSpotifyLogin();
  }, []);

  const disconnect = useCallback(async () => {
    clearSpotifySession();
    if (uid) await deleteDoc(doc(db, "users", uid)).catch(() => {});
    setConnected(false);
    setProfile(null);
  }, [uid]);

  const changeVisibility = useCallback(
    async (v: Visibility) => {
      setVisibility(v);
      visibilityRef.current = v;
      localStorage.setItem(VIS_KEY, v);
      await writeMe();
    },
    [writeMe]
  );

  const toggleFriend = useCallback(
    async (targetUid: string) => {
      if (!uid || targetUid === uid) return;
      const ref = doc(db, "friendships", uid);
      const cur = (await getDoc(ref)).data()?.friends as string[] | undefined;
      const set = new Set(cur || []);
      if (set.has(targetUid)) set.delete(targetUid);
      else set.add(targetUid);
      await setDoc(ref, { uid, friends: Array.from(set) }, { merge: true });
    },
    [uid]
  );

  /* ---------- Haritada gosterilecekleri filtrele ---------- */
  const now = Date.now();
  const me = allUsers.find((u) => u.uid === uid) || null;
  const users = allUsers.filter((u) => {
    if (u.uid === uid) return false;
    if (!u.location) return false;
    if (now - (u.lastActive || 0) > ACTIVE_WINDOW_MS) return false;
    if (u.visibility === "off") return false;
    if (u.visibility === "friends") {
      // Sadece karsilikli/tek yonlu arkadaslar gorebilir
      return friends.includes(u.uid);
    }
    return true; // global
  });

  return {
    ready,
    loading,
    error,
    configured,
    uid,
    profile,
    connected,
    visibility,
    users,
    me,
    friends,
    connectSpotify,
    disconnect,
    changeVisibility,
    toggleFriend,
    refreshLocation,
  };
}
