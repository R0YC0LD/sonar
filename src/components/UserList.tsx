"use client";

import type { UserDoc } from "@/types";

interface Props {
  users: UserDoc[];
  friends: string[];
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  onToggleFriend: (uid: string) => void;
}

export function UserList({ users, friends, selectedUid, onSelect, onToggleFriend }: Props) {
  const onlineUsers = users.filter((u) => Date.now() - (u.lastActive || 0) <= 5 * 60_000);
  const offlineUsers = users.filter((u) => Date.now() - (u.lastActive || 0) > 5 * 60_000);

  return (
    <div className="glass flex h-full w-full flex-col rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-bold">Canli Dinleyiciler</h3>
        <span className="flex items-center gap-1.5 rounded-full bg-spotify/15 px-2.5 py-0.5 text-xs font-semibold text-spotify">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-spotify" />
          {onlineUsers.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {users.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/40">
            <span className="text-3xl">🎧</span>
            Su an aktif baska dinleyici yok.
            <span className="text-xs">Arkadaslarini davet et!</span>
          </div>
        )}

        {onlineUsers.length > 0 && (
          <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
            Online
          </div>
        )}

        {onlineUsers.map((u) => {
          const np = u.nowPlaying;
          const isFriend = friends.includes(u.uid);
          const selected = selectedUid === u.uid;
          return (
            <div
              key={u.uid}
              onClick={() => onSelect(u.uid)}
              className={`group mb-1 flex cursor-pointer items-center gap-3 rounded-xl p-2 transition ${
                selected ? "bg-spotify/15" : "hover:bg-white/5"
              }`}
            >
              <div className="relative shrink-0">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                    {u.displayName[0]?.toUpperCase()}
                  </div>
                )}
                {np?.isPlaying && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-spotify ring-2 ring-[#0d0d16]">
                    <span className="h-1.5 w-1.5 rounded-full bg-black" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{u.displayName}</span>
                  {u.country && (
                    <span className="shrink-0 text-[10px] text-white/40">· {u.country}</span>
                  )}
                </div>
                {np ? (
                  <div className="truncate text-xs text-white/55">
                    <span className="text-spotify">♪</span> {np.title} — {np.artists}
                  </div>
                ) : (
                  <div className="truncate text-xs text-white/35">calan bir sey yok</div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFriend(u.uid);
                }}
                title={isFriend ? "Arkadasliktan cikar" : "Arkadas ekle"}
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium transition ${
                  isFriend
                    ? "bg-spotify/20 text-spotify"
                    : "bg-white/5 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-white/10"
                }`}
              >
                {isFriend ? "✓ Arkadas" : "+ Ekle"}
              </button>
            </div>
          );
        })}

        {offlineUsers.length > 0 && (
          <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/35">
            Cevrimdisi
          </div>
        )}

        {offlineUsers.map((u) => {
          const isFriend = friends.includes(u.uid);
          const selected = selectedUid === u.uid;
          return (
            <div
              key={u.uid}
              onClick={() => onSelect(u.uid)}
              className={`group mb-1 flex cursor-pointer items-center gap-3 rounded-xl p-2 opacity-70 transition ${
                selected ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <div className="relative shrink-0">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="h-11 w-11 rounded-full object-cover grayscale" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                    {u.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white/20 ring-2 ring-[#0d0d16]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{u.displayName}</span>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/45">
                    offline
                  </span>
                </div>
                <div className="truncate text-xs text-white/35">konum gizli</div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFriend(u.uid);
                }}
                title={isFriend ? "Arkadasliktan cikar" : "Arkadas ekle"}
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium transition ${
                  isFriend
                    ? "bg-spotify/20 text-spotify"
                    : "bg-white/5 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-white/10"
                }`}
              >
                {isFriend ? "✓ Arkadas" : "+ Ekle"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
