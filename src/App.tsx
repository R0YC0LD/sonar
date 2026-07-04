"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe } from "@/components/Globe";
import { SpotifyCard } from "@/components/ui/spotify-card";
import { LoginScreen } from "@/components/LoginScreen";
import { SettingsPanel } from "@/components/SettingsPanel";
import { UserList } from "@/components/UserList";
import { PrivacyPolicy, TermsOfService } from "@/components/LegalPage";
import { usePresence } from "@/hooks/usePresence";
import { completeSpotifyLogin } from "@/lib/spotify";

/* --------- Spotify /callback ekrani --------- */
function CallbackScreen() {
  const [msg, setMsg] = useState("Spotify ile baglaniliyor...");
  useEffect(() => {
    completeSpotifyLogin().then((ok) => {
      setMsg(ok ? "Basarili! Yonlendiriliyorsun..." : "Baglanti basarisiz. Tekrar deneniyor...");
      const home = import.meta.env.BASE_URL;
      window.history.replaceState({}, "", home);
      setTimeout(() => (window.location.href = home), 600);
    });
  }, []);
  return (
    <div className="relative z-10 flex min-h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-spotify" />
        <p className="text-sm text-white/70">{msg}</p>
      </div>
    </div>
  );
}

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
  const isCallback =
    typeof window !== "undefined" && window.location.pathname.endsWith("/callback");

  const presence = usePresence();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false); // mobil panel

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

  if (isCallback) {
    return (
      <>
        <div className="app-bg" />
        <CallbackScreen />
      </>
    );
  }

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
        <LoginScreen onConnect={presence.connectSpotify} configured={presence.configured} />
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
                onMarkerClick={(id) => {
                  if (id !== presence.me?.uid) {
                    setSelectedUid(id);
                    setListOpen(false);
                  }
                }}
              />
            </div>

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
                  <SpotifyCard
                    songs={[
                      {
                        title: selectedUser.nowPlaying.title,
                        artists: selectedUser.nowPlaying.artists,
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
          <aside className="hidden w-[320px] shrink-0 lg:block">
            <UserList
              users={presence.users}
              friends={presence.friends}
              selectedUid={selectedUid}
              onSelect={setSelectedUid}
              onToggleFriend={presence.toggleFriend}
            />
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
        onRefreshLocation={presence.refreshLocation}
        onDisconnect={presence.disconnect}
      />

      {presence.error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm text-white">
          {presence.error}
        </div>
      )}
    </>
  );
}
