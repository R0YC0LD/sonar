export type Visibility = "global" | "friends" | "off";

export interface LocalProfile {
  id: string;
  displayName: string;
  photoURL: string;
}

export interface LocalProfileInput {
  displayName: string;
  photoURL: string;
  photoFile?: File | null;
}

export interface PlayableTrack {
  id: string;
  provider: "youtube";
  videoId: string;
  title: string;
  artists: string;
  album?: string;
  albumArt: string;
  duration: number;
  trackUrl?: string;
}

export interface NowPlaying {
  id?: string;
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
  musicProvider?: "sonar";
  musicUserId: string;
  displayName: string;
  photoURL: string;
  country?: string;
  city?: string;
  location: { lat: number; lng: number } | null;
  visibility: Visibility;
  nowPlaying: NowPlaying | null;
  lastActive: number; // ms epoch
}
