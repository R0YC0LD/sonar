import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, ensureAnonymousAuth, isFirebaseConfigured } from "@/lib/firebase";
import { resolveLocation } from "@/lib/geo";
import type { LocalProfile, NowPlaying, UserDoc, Visibility } from "@/types";

const POLL_MS = 25_000;
const ACTIVE_WINDOW_MS = 5 * 60_000;
const VIS_KEY = "sonar_visibility";
const PROFILE_KEY = "sonar_profile";

export interface PresenceState {
  ready: boolean;
  loading: boolean;
  error: string | null;
  configured: boolean;
  uid: string | null;
  profile: LocalProfile | null;
  connected: boolean;
  visibility: Visibility;
  users: UserDoc[];
  me: UserDoc | null;
  friends: string[];
  connectProfile: (profile: Omit<LocalProfile, "id">) => Promise<void>;
  updateProfile: (profile: Omit<LocalProfile, "id">) => Promise<void>;
  setNowPlaying: (track: NowPlaying | null) => Promise<void>;
  disconnect: () => Promise<void>;
  changeVisibility: (v: Visibility) => Promise<void>;
  toggleFriend: (uid: string) => Promise<void>;
  refreshLocation: () => Promise<void>;
}

function loadProfile(): LocalProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalProfile;
    return parsed.displayName ? parsed : null;
  } catch {
    return null;
  }
}

function saveProfile(profile: LocalProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function makeProfile(uid: string, input: Omit<LocalProfile, "id">): LocalProfile {
  return {
    id: uid,
    displayName: input.displayName.trim(),
    photoURL: input.photoURL.trim(),
  };
}

export function usePresence(): PresenceState {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(() => loadProfile());
  const [visibility, setVisibility] = useState<Visibility>(
    (localStorage.getItem(VIS_KEY) as Visibility) || "global"
  );
  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);
  const [friends, setFriends] = useState<string[]>([]);

  const configured = isFirebaseConfigured;
  const connected = Boolean(profile);
  const profileRef = useRef<LocalProfile | null>(profile);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const placeRef = useRef<{ city?: string; country?: string }>({});
  const nowPlayingRef = useRef<NowPlaying | null>(null);
  const visibilityRef = useRef<Visibility>(visibility);
  profileRef.current = profile;
  visibilityRef.current = visibility;

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

  useEffect(() => {
    if (!configured || !uid) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserDoc[] = [];
      snap.forEach((d) => list.push(d.data() as UserDoc));
      setAllUsers(list);
    });
    return () => unsub();
  }, [configured, uid]);

  useEffect(() => {
    if (!configured || !uid) return;
    const unsub = onSnapshot(doc(db, "friendships", uid), (d) => {
      setFriends((d.data()?.friends as string[]) || []);
    });
    return () => unsub();
  }, [configured, uid]);

  const refreshLocation = useCallback(async () => {
    const loc = await resolveLocation();
    if (loc) {
      locationRef.current = { lat: loc.lat, lng: loc.lng };
      placeRef.current = { city: loc.city, country: loc.country };
    }
  }, []);

  const writeMe = useCallback(async () => {
    const currentProfile = profileRef.current;
    if (!uid || !currentProfile) return;
    const vis = visibilityRef.current;
    const payload: UserDoc = {
      uid,
      musicProvider: "sonar",
      musicUserId: uid,
      displayName: currentProfile.displayName,
      photoURL: currentProfile.photoURL,
      city: placeRef.current.city,
      country: placeRef.current.country,
      location: vis === "off" ? null : locationRef.current,
      visibility: vis,
      nowPlaying: nowPlayingRef.current,
      lastActive: Date.now(),
    };
    const clean = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, "users", uid), clean, { merge: true });
  }, [uid]);

  useEffect(() => {
    if (!configured || !uid || !profile) return;
    let stop = false;

    const tick = async () => {
      if (stop) return;
      try {
        if (!locationRef.current) await refreshLocation();
        await writeMe();
        setError(null);
      } catch {
        setError("Canli durum guncellenemedi. Birazdan tekrar denenecek.");
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    const onUnload = () => {
      const stale = { lastActive: Date.now() - ACTIVE_WINDOW_MS - 1000 };
      updateDoc(doc(db, "users", uid), stale).catch(() => {});
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [configured, uid, profile, refreshLocation, writeMe]);

  const connectProfile = useCallback(
    async (input: Omit<LocalProfile, "id">) => {
      if (!uid) {
        setError("Kimlik hazir degil. Sayfayi yenileyip tekrar dene.");
        return;
      }
      if (!input.displayName.trim()) {
        setError("Kullanici adi bos olamaz.");
        return;
      }
      const next = makeProfile(uid, input);
      saveProfile(next);
      setProfile(next);
      profileRef.current = next;
      await refreshLocation();
      await writeMe();
    },
    [uid, refreshLocation, writeMe]
  );

  const updateProfile = useCallback(
    async (input: Omit<LocalProfile, "id">) => {
      if (!uid) return;
      const next = makeProfile(uid, input);
      saveProfile(next);
      setProfile(next);
      profileRef.current = next;
      await writeMe();
    },
    [uid, writeMe]
  );

  const setNowPlaying = useCallback(
    async (track: NowPlaying | null) => {
      nowPlayingRef.current = track;
      await writeMe();
    },
    [writeMe]
  );

  const disconnect = useCallback(async () => {
    localStorage.removeItem(PROFILE_KEY);
    nowPlayingRef.current = null;
    if (uid) await deleteDoc(doc(db, "users", uid)).catch(() => {});
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

  const now = Date.now();
  const me = allUsers.find((u) => u.uid === uid) || null;
  const users = useMemo(
    () =>
      allUsers.filter((u) => {
        if (u.uid === uid) return false;
        if (!u.location) return false;
        if (now - (u.lastActive || 0) > ACTIVE_WINDOW_MS) return false;
        if (u.visibility === "off") return false;
        if (u.visibility === "friends") return friends.includes(u.uid);
        return true;
      }),
    [allUsers, friends, now, uid]
  );

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
    connectProfile,
    updateProfile,
    setNowPlaying,
    disconnect,
    changeVisibility,
    toggleFriend,
    refreshLocation,
  };
}
