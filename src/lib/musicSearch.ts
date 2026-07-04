import type { PlayableTrack } from "@/types";

interface ItunesTrack {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
  trackTimeMillis?: number;
  kind?: string;
}

function artwork600(url?: string): string {
  return url ? url.replace("100x100bb", "600x600bb") : "";
}

export async function searchTracks(query: string): Promise<PlayableTrack[]> {
  const term = query.trim();
  if (!term) return [];

  const params = new URLSearchParams({
    term,
    media: "music",
    entity: "song",
    limit: "18",
  });

  const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Sarki aramasi yapilamadi. Lutfen tekrar dene.");
  }

  const data = (await res.json()) as { results?: ItunesTrack[] };
  return (data.results || [])
    .filter((item) => item.kind === "song" && item.previewUrl && item.trackName && item.artistName)
    .map((item) => ({
      id: String(item.trackId || item.previewUrl),
      title: item.trackName!,
      artists: item.artistName!,
      album: item.collectionName || "",
      albumArt: artwork600(item.artworkUrl100),
      duration: 30,
      previewUrl: item.previewUrl!,
      trackUrl: item.trackViewUrl,
    }));
}
