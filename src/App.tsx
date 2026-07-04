"use client";

import { useMemo, useState } from "react";
import { Globe } from "@/components/Globe";
import type { GlobeView } from "@/components/Globe";
import { MusicCard } from "@/components/ui/music-card";
import { LoginScreen } from "@/components/LoginScreen";
import { SettingsPanel } from "@/components/SettingsPanel";
import { UserList } from "@/components/UserList";
import { MusicPlayer } from "@/components/MusicPlayer";
import { PrivacyPolicy, TermsOfService } from "@/components/LegalPage";
import { usePresence } from "@/hooks/usePresence";
import type { UserDoc } from "@/types";

/* --------- Basit yol yonlendirici (alt-yola duyarli: kok veya /sonar/) --------- */
export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  if (path.endsWith("/privacy")) {
    return (
      <>
        <div className="app-bg" />
        <PrivacyPolicy />
      </>
    );
  }
  if (path.endsWith("/terms")) {
    return (
      <>
        <div className="app-bg" />
        <TermsOfService />
      </>
    );
  }
  return <MainApp />;
}

function MainApp() {
  const presence = usePresence();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false); // mobil panel
  const [globeZoom, setGlobeZoom] = useState(1);
  const [globeView, setGlobeView] = useState<GlobeView>({ phi: 0, theta: 0.25, zoom: 1 });

  const selectedUser = useMemo(
    () => presence.users.find((u) => u.uid === selectedUid) || null,
    [presence.users, selectedUid]
  );

  // Haritadaki isaretciler (kendim + digerleri)
  const markers = useMemo(() => {
    const arr = presence.users
      .filter((u) => u.location)
      .map((u) => ({
        id: u.uid,
        location: [u.location!.lat, u.location!.lng] as [number, number],
        label: u.displayName,
      }));
    if (presence.me?.location) {
      arr.push({
        id: presence.me.uid,
        location: [presence.me.location.lat, presence.me.location.lng] as [number, number],
        label: "Sen",
      });
    }
    return arr;
  }, [presence.users, presence.me]);

  // Secili kullaniciya ise cizgi (arc)
  const arcs = useMemo(() => {
    if (!presence.me?.location || !selectedUser?.location) return [];
    return [
      {
        id: `arc-${selectedUser.uid}`,
        from: [presence.me.location.lat, presence.me.location.lng] as [number, number],
        to: [selectedUser.location.lat, selectedUser.location.lng] as [number, number],
      },
    ];
  }, [presence.me, selectedUser]);

  const mapUsers = useMemo(() => {
    const unique = new Map<string, UserDoc>();
    if (presence.me?.location && isActiveUser(presence.me)) unique.set(presence.me.uid, presence.me);
    presence.users.forEach((u) => {
      if (u.location && isActiveUser(u)) unique.set(u.uid, u);
    });
    return Array.from(unique.values());
  }, [presence.me, presence.users]);

  const popupUsers = useMemo(() => {
    if (globeZoom < 2.05) return [];
    const projected = mapUsers
      .map((user, index) => projectUserToGlobe(user, globeView, index))
      .filter((item): item is ProjectedUser => Boolean(item))
      .sort((a, b) => Number(Boolean(b.user.nowPlaying)) - Number(Boolean(a.user.nowPlaying)))
      .slice(0, 12);
    return spreadProjectedUsers(projected);
  }, [globeZoom, globeView, mapUsers]);

  if (!presence.ready || presence.loading) {
    return (
      <>
        <div className="app-bg" />
        <div className="relative z-10 flex min-h-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-spotify" />
        </div>
      </>
    );
  }

  if (!presence.connected) {
    return (
      <>
        <div className="app-bg" />
        <LoginScreen
          onLogin={presence.login}
          onRegister={presence.register}
          configured={presence.configured}
          error={presence.error}
        />
      </>
    );
  }

  return (
    <>
      <div className="app-bg" />

      <div className="relative z-10 flex h-full min-h-dvh flex-col">
        {/* ---------- Header ---------- */}
        <header className="flex items-center justify-between px-3 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-spotify/15">
              <span className="text-lg">🌐</span>
            </div>
            <div>
              <div className="text-lg font-extrabold leading-none">Sonar</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Dunyayi Dinle</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setListOpen((v) => !v)}
              className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium lg:hidden"
            >
              🎧 {presence.users.length}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="glass flex h-9 items-center gap-2 rounded-full px-3 text-sm"
            >
              {presence.profile?.photoURL ? (
                <img
                  src={presence.profile.photoURL}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <span>⚙️</span>
              )}
              <span className="hidden max-w-[120px] truncate md:inline">
                {presence.profile?.displayName}
              </span>
            </button>
          </div>
        </header>

        {/* ---------- Ana govde ---------- */}
        <main className="relative flex min-h-0 flex-1 gap-4 px-3 pb-[44dvh] md:px-6 lg:pb-4">
          {/* Globe */}
          <div className="relative flex min-w-0 flex-1 items-center justify-center">
            <div className="w-[min(92vw,52vh,760px)] sm:w-[min(92vw,58vh,760px)] lg:w-[min(92vw,72vh,760px)]">
              <Globe
                markers={markers}
                arcs={arcs}
                onZoomChange={setGlobeZoom}
                onViewChange={setGlobeView}
                onMarkerClick={(id) => {
                  if (id !== presence.me?.uid) {
                    setSelectedUid(id);
                    setListOpen(false);
                  }
                }}
              />
            </div>

            {popupUsers.map((item) => (
              <UserBubble
                key={item.user.uid}
                item={item}
                onClick={() => setSelectedUid(item.user.uid)}
              />
            ))}

            {/* Secili kullanici karti */}
            {selectedUser && (
              <div className="absolute bottom-4 left-4 animate-fade-in">
                <div className="mb-2 flex items-center gap-2 pl-1">
                  {selectedUser.photoURL && (
                    <img
                      src={selectedUser.photoURL}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  )}
                  <span className="text-sm font-semibold">{selectedUser.displayName}</span>
                  {selectedUser.city && (
                    <span className="text-xs text-white/40">· {selectedUser.city}</span>
                  )}
                  <button
                    onClick={() => setSelectedUid(null)}
                    className="ml-1 text-white/40 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                {selectedUser.nowPlaying ? (
                  <MusicCard
                    songs={[
                      {
                        title: selectedUser.nowPlaying.title,
                        artists: selectedUser.nowPlaying.artists,
                        album: selectedUser.nowPlaying.album,
                        albumArt: selectedUser.nowPlaying.albumArt,
                        duration: selectedUser.nowPlaying.duration,
                        progress: selectedUser.nowPlaying.progress,
                        isPlaying: selectedUser.nowPlaying.isPlaying,
                        trackUrl: selectedUser.nowPlaying.trackUrl,
                      },
                    ]}
                  />
                ) : (
                  <div className="glass w-[300px] rounded-2xl p-6 text-center text-sm text-white/50">
                    Su an bir sey calmiyor.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Masaustu kullanici listesi */}
          <aside className="hidden w-[360px] shrink-0 lg:flex lg:flex-col lg:gap-4">
            <div className="min-h-0 flex-[1.15]">
              <MusicPlayer onNowPlaying={presence.setNowPlaying} />
            </div>
            <div className="min-h-0 flex-1">
              <UserList
                users={presence.users}
                friends={presence.friends}
                selectedUid={selectedUid}
                onSelect={setSelectedUid}
                onToggleFriend={presence.toggleFriend}
              />
            </div>
          </aside>
        </main>
      </div>

      {/* Mobil kullanici listesi (alt sheet) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 h-[60vh] px-3 pb-3 transition-transform duration-300 lg:hidden ${
          listOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto h-full max-w-lg">
          <UserList
            users={presence.users}
            friends={presence.friends}
            selectedUid={selectedUid}
            onSelect={(id) => {
              setSelectedUid(id);
              setListOpen(false);
            }}
            onToggleFriend={presence.toggleFriend}
          />
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={presence.profile}
        visibility={presence.visibility}
        onChangeVisibility={presence.changeVisibility}
        onUpdateProfile={presence.updateProfile}
        onRefreshLocation={presence.refreshLocation}
        onDisconnect={presence.disconnect}
      />

      <div className="fixed inset-x-3 bottom-3 z-20 h-[min(40dvh,350px)] lg:hidden">
        <div className="mx-auto h-full max-w-md">
          <MusicPlayer onNowPlaying={presence.setNowPlaying} />
        </div>
      </div>

      {presence.error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm text-white">
          {presence.error}
        </div>
      )}
    </>
  );
}

interface ProjectedUser {
  user: UserDoc;
  left: number;
  top: number;
  cardLeft: number;
  cardTop: number;
  scale: number;
  isEdge: boolean;
  anchor: "top" | "right" | "left" | "bottom";
}

function isActiveUser(user: UserDoc) {
  return Date.now() - (user.lastActive || 0) <= 5 * 60_000;
}

function projectUserToGlobe(user: UserDoc, view: GlobeView, index: number): ProjectedUser | null {
  if (!user.location) return null;
  const lat = (user.location.lat * Math.PI) / 180;
  const lng = (user.location.lng * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  const rotatedLng = lng + view.phi;
  const x = cosLat * Math.sin(rotatedLng);
  const y0 = Math.sin(lat);
  const z0 = cosLat * Math.cos(rotatedLng);
  const y = y0 * Math.cos(view.theta) - z0 * Math.sin(view.theta);
  const z = y0 * Math.sin(view.theta) + z0 * Math.cos(view.theta);

  if (z < 0.16) return null;

  const zoomScale = Math.min(view.zoom, 3.1);
  const left = 50 + x * 39 * zoomScale;
  const top = 50 - y * 39 * zoomScale;
  if (left < 5 || left > 95 || top < 6 || top > 94) return null;
  const anchors: ProjectedUser["anchor"][] = ["top", "right", "left", "bottom"];
  const anchor = anchors[index % anchors.length];
  const offset = popupOffset(anchor, index);

  return {
    user,
    left,
    top,
    cardLeft: Math.max(10, Math.min(90, left + offset.x)),
    cardTop: Math.max(8, Math.min(88, top + offset.y)),
    scale: Math.min(1.08, 0.78 + view.zoom * 0.08 + (user.nowPlaying ? 0.05 : 0)),
    isEdge: z < 0.22,
    anchor,
  };
}

function popupOffset(anchor: ProjectedUser["anchor"], index: number) {
  const jitter = ((index % 3) - 1) * 2.2;
  if (anchor === "right") return { x: 11 + jitter, y: -2 };
  if (anchor === "left") return { x: -11 + jitter, y: -2 };
  if (anchor === "bottom") return { x: jitter, y: 10 };
  return { x: jitter, y: -10 };
}

function spreadProjectedUsers(items: ProjectedUser[]) {
  const placed: ProjectedUser[] = [];
  items.forEach((item) => {
    let next = { ...item };
    for (let i = 0; i < placed.length; i += 1) {
      const other = placed[i];
      if (Math.abs(next.cardLeft - other.cardLeft) < 13 && Math.abs(next.cardTop - other.cardTop) < 9) {
        const offset = popupOffset(next.anchor, i + placed.length + 1);
        next = {
          ...next,
          cardLeft: Math.max(10, Math.min(90, next.left + offset.x * 1.45)),
          cardTop: Math.max(8, Math.min(88, next.top + offset.y * 1.35)),
        };
      }
    }
    placed.push(next);
  });
  return placed;
}

function UserBubble({
  item,
  onClick,
}: {
  item: ProjectedUser;
  onClick: () => void;
}) {
  const { user } = item;
  return (
    <button
      onClick={onClick}
      aria-label={`${user.displayName} dinleme popup`}
      className={`popup-bubble glass absolute z-30 flex max-w-[230px] origin-center items-center gap-2 rounded-2xl border border-spotify/20 p-2 text-left shadow-2xl shadow-black/35 transition duration-300 hover:border-spotify/45 hover:bg-white/[0.08] ${
        item.isEdge ? "opacity-75" : "opacity-100"
      }`}
      style={{
        left: `${item.cardLeft}%`,
        top: `${item.cardTop}%`,
        transform: `translate(-50%, -50%) scale(${item.scale})`,
      }}
    >
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-spotify/20 text-sm font-bold">
          {user.displayName[0]?.toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold">{user.displayName}</span>
        {user.nowPlaying ? (
          <>
            <span className="block truncate text-[11px] font-semibold text-spotify">
              {user.nowPlaying.title}
            </span>
            <span className="block truncate text-[10px] text-white/45">
              {user.nowPlaying.artists}
            </span>
          </>
        ) : (
          <span className="block truncate text-[11px] text-white/45">Su an bir sey calmiyor</span>
        )}
      </span>
    </button>
  );
}
