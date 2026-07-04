import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  createAccountWithEmail,
  db,
  isFirebaseConfigured,
  listenAuthState,
  signInWithEmail,
  signOutCurrentUser,
} from "@/lib/firebase";
import { resolveLocation } from "@/lib/geo";
import { uploadAvatar } from "@/lib/avatar";
import type {
  LocalProfile,
  LocalProfileInput,
  LoginInput,
  NowPlaying,
  RegisterInput,
  UserDoc,
  Visibility,
} from "@/types";

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
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  updateProfile: (profile: LocalProfileInput) => Promise<void>;
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

function makeProfile(uid: string, input: LocalProfileInput, photoURL: string): LocalProfile {
  return {
    id: uid,
    displayName: input.displayName.trim(),
    photoURL,
  };
}

export function usePresence(): PresenceState {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(
    (localStorage.getItem(VIS_KEY) as Visibility) || "global"
  );
  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);
  const [friends, setFriends] = useState<string[]>([]);

  const configured = isFirebaseConfigured;
  const connected = Boolean(uid && profile);
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
    const unsub = listenAuthState(async (user) => {
      try {
        if (!mounted) return;
        if (!user) {
          setUid(null);
          setProfile(null);
          setAllUsers([]);
          setFriends([]);
          setReady(true);
          setLoading(false);
          return;
        }
        setUid(user.uid);
        const cached = loadProfile();
        if (cached?.id === user.uid) {
          setProfile(cached);
          profileRef.current = cached;
        }
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as UserDoc;
          const next = makeProfile(
            user.uid,
            { displayName: data.displayName, photoURL: data.photoURL || "" },
            data.photoURL || ""
          );
          saveProfile(next);
          setProfile(next);
          profileRef.current = next;
          const nextVisibility = data.visibility || visibilityRef.current;
          setVisibility(nextVisibility);
          visibilityRef.current = nextVisibility;
        }
        setReady(true);
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setError("Firebase oturumu yuklenemedi: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
        setLoading(false);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
      unsub();
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
      const stale = {
        lastActive: Date.now() - ACTIVE_WINDOW_MS - 1000,
        nowPlaying: null,
        location: null,
      };
      updateDoc(doc(db, "users", uid), stale).catch(() => {});
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [configured, uid, profile, refreshLocation, writeMe]);

  const register = useCallback(
    async (input: RegisterInput) => {
      if (!input.displayName.trim()) {
        setError("Kullanici adi bos olamaz.");
        return;
      }
      try {
        const user = await createAccountWithEmail(input.email.trim(), input.password);
        const next = makeProfile(user.uid, { displayName: input.displayName, photoURL: "" }, "");
        saveProfile(next);
        setUid(user.uid);
        setProfile(next);
        profileRef.current = next;
        await refreshLocation();
        const payload: UserDoc = {
          uid: user.uid,
          musicProvider: "sonar",
          musicUserId: user.uid,
          displayName: next.displayName,
          photoURL: "",
          city: placeRef.current.city,
          country: placeRef.current.country,
          location: visibilityRef.current === "off" ? null : locationRef.current,
          visibility: visibilityRef.current,
          nowPlaying: null,
          lastActive: Date.now(),
          createdAt: Date.now(),
        };
        await setDoc(doc(db, "users", user.uid), JSON.parse(JSON.stringify(payload)), { merge: true });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kayit basarisiz oldu.");
      }
    },
    [refreshLocation]
  );

  const login = useCallback(
    async (input: LoginInput) => {
      try {
        const user = await signInWithEmail(input.email.trim(), input.password);
        setUid(user.uid);
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? (snap.data() as UserDoc) : null;
        const next = makeProfile(
          user.uid,
          {
            displayName: data?.displayName || user.email?.split("@")[0] || "Sonar Kullanici",
            photoURL: data?.photoURL || "",
          },
          data?.photoURL || ""
        );
        saveProfile(next);
        setProfile(next);
        profileRef.current = next;
        if (data?.visibility) {
          setVisibility(data.visibility);
          visibilityRef.current = data.visibility;
        }
        await refreshLocation();
        const payload: Partial<UserDoc> = {
          uid: user.uid,
          musicProvider: "sonar",
          musicUserId: user.uid,
          displayName: next.displayName,
          photoURL: next.photoURL,
          city: placeRef.current.city,
          country: placeRef.current.country,
          location: visibilityRef.current === "off" ? null : locationRef.current,
          visibility: visibilityRef.current,
          lastActive: Date.now(),
        };
        await setDoc(doc(db, "users", user.uid), JSON.parse(JSON.stringify(payload)), { merge: true });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Giris basarisiz oldu.");
      }
    },
    [refreshLocation]
  );

  const updateProfile = useCallback(
    async (input: LocalProfileInput) => {
      if (!uid) return;
      try {
        const currentPhoto = profileRef.current?.photoURL || "";
        const photoURL = input.photoFile
          ? await uploadAvatar(uid, input.photoFile)
          : input.photoURL.trim() || currentPhoto;
        const next = makeProfile(uid, input, photoURL);
        saveProfile(next);
        setProfile(next);
        profileRef.current = next;
        await writeMe();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Profil fotografi yuklenemedi.");
      }
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
    if (uid) {
      await updateDoc(doc(db, "users", uid), {
        lastActive: Date.now() - ACTIVE_WINDOW_MS - 1000,
        nowPlaying: null,
        location: null,
      }).catch(() => {});
    }
    await signOutCurrentUser().catch(() => {});
    setProfile(null);
    setUid(null);
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
      allUsers
        .filter((u) => {
          if (u.uid === uid) return false;
          if (u.visibility === "off") return false;
          if (u.visibility === "friends") return friends.includes(u.uid);
          return true;
        })
        .map((u) => {
          const active = now - (u.lastActive || 0) <= ACTIVE_WINDOW_MS;
          return active ? u : { ...u, location: null, nowPlaying: null };
        })
        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0)),
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
    login,
    register,
    updateProfile,
    setNowPlaying,
    disconnect,
    changeVisibility,
    toggleFriend,
    refreshLocation,
  };
}
