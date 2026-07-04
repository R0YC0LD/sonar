"use client";

import { useMemo, useState } from "react";
import { Globe } from "@/components/Globe";
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

  const popupUsers = useMemo(() => {
    if (globeZoom < 1.85) return [];
    return presence.users.filter((u) => u.location && u.nowPlaying).slice(0, 10);
  }, [globeZoom, presence.users]);

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
          onConnect={presence.connectProfile}
          configured={presence.configured}
          error={presence.error}
        />
      </>
    );
  }

  return (
    <>
      <div className="app-bg" />

      <div className="relative z-10 flex h-full flex-col">
        {/* ---------- Header ---------- */}
        <header className="flex items-center justify-between px-4 py-3 md:px-6">
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
        <main className="relative flex min-h-0 flex-1 gap-4 px-4 pb-4 md:px-6">
          {/* Globe */}
          <div className="relative flex min-w-0 flex-1 items-center justify-center">
            <div className="w-[min(92vw,72vh,760px)]">
              <Globe
                markers={markers}
                arcs={arcs}
                onZoomChange={setGlobeZoom}
                onMarkerClick={(id) => {
                  if (id !== presence.me?.uid) {
                    setSelectedUid(id);
                    setListOpen(false);
                  }
                }}
              />
            </div>

            {popupUsers.map((u, index) => (
              <UserBubble
                key={u.uid}
                user={u}
                index={index}
                onClick={() => setSelectedUid(u.uid)}
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

      <div className="fixed bottom-4 right-4 z-20 h-[46vh] w-[min(92vw,360px)] lg:hidden">
        <MusicPlayer onNowPlaying={presence.setNowPlaying} />
      </div>

      {presence.error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm text-white">
          {presence.error}
        </div>
      )}
    </>
  );
}

function bubblePosition(user: UserDoc, index: number) {
  const lat = user.location?.lat ?? 0;
  const lng = user.location?.lng ?? 0;
  const x = 50 + (lng / 180) * 34;
  const y = 50 - (lat / 90) * 30;
  const jitter = (index % 5) * 3;
  return {
    left: `${Math.max(12, Math.min(82, x + jitter))}%`,
    top: `${Math.max(10, Math.min(78, y - jitter))}%`,
  };
}

function UserBubble({
  user,
  index,
  onClick,
}: {
  user: UserDoc;
  index: number;
  onClick: () => void;
}) {
  const style = bubblePosition(user, index);
  return (
    <button
      onClick={onClick}
      className="glass absolute z-20 flex max-w-[210px] animate-fade-in items-center gap-2 rounded-2xl p-2 text-left shadow-2xl transition hover:scale-105"
      style={style}
    >
      {user.photoURL ? (
        <img src={user.photoURL} alt="" className="h-12 w-12 rounded-xl object-cover" />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-spotify/20 text-sm font-bold">
          {user.displayName[0]?.toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold">{user.displayName}</span>
        <span className="block truncate text-[11px] text-spotify">{user.nowPlaying?.title}</span>
        <span className="block truncate text-[10px] text-white/45">{user.nowPlaying?.artists}</span>
      </span>
    </button>
  );
}
