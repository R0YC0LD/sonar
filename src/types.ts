export type Visibility = "global" | "friends" | "off";

export interface NowPlaying {
  title: string;
  artists: string;
  albumArt: string;
  duration: number; // saniye
  progress: number; // saniye
  isPlaying: boolean;
  trackUrl?: string;
  updatedAt: number; // ms epoch
}

export interface UserDoc {
  uid: string;
  spotifyId: string;
  displayName: string;
  photoURL: string;
  country?: string;
  city?: string;
  location: { lat: number; lng: number } | null;
  visibility: Visibility;
  nowPlaying: NowPlaying | null;
  lastActive: number; // ms epoch
}

export interface SpotifyProfile {
  id: string;
  displayName: string;
  photoURL: string;
}
