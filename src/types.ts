export type Visibility = "global" | "friends" | "off";

export interface NowPlaying {
  title: string;
  artists: string;
  album?: string;
  albumArt: string;
  duration: number; // saniye
  progress: number; // saniye
  isPlaying: boolean;
  trackUrl?: string;
  updatedAt: number; // ms epoch
}

export interface UserDoc {
  uid: string;
  musicProvider?: "lastfm";
  musicUserId: string;
  lastfmUsername?: string;
  displayName: string;
  photoURL: string;
  country?: string;
  city?: string;
  location: { lat: number; lng: number } | null;
  visibility: Visibility;
  nowPlaying: NowPlaying | null;
  lastActive: number; // ms epoch
}

export interface LastfmProfile {
  id: string;
  username: string;
  displayName: string;
  photoURL: string;
  profileURL: string;
}
