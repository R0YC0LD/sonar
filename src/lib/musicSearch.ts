import type { PlayableTrack } from "@/types";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

interface YoutubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
      high?: { url?: string };
    };
  };
}

function decodeHtml(value: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = value;
  return el.value;
}

function thumbnail(item: YoutubeSearchItem): string {
  return (
    item.snippet?.thumbnails?.high?.url ||
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.default?.url ||
    ""
  );
}

export async function searchTracks(query: string): Promise<PlayableTrack[]> {
  const term = query.trim();
  if (!term) return [];
  if (!API_KEY) {
    throw new Error("YouTube API key eksik. VITE_YOUTUBE_API_KEY ayarlanmalı.");
  }

  const params = new URLSearchParams({
    key: API_KEY,
    part: "snippet",
    q: term,
    type: "video",
    maxResults: "12",
    videoEmbeddable: "true",
    safeSearch: "none",
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error("YouTube aramasi basarisiz oldu. API key, kota veya referrer ayarlarini kontrol et.");
  }

  const data = (await res.json()) as { items?: YoutubeSearchItem[] };
  return (data.items || [])
    .filter((item) => item.id?.videoId && item.snippet?.title)
    .map((item) => {
      const videoId = item.id!.videoId!;
      return {
        id: videoId,
        provider: "youtube" as const,
        videoId,
        title: decodeHtml(item.snippet!.title || "YouTube videosu"),
        artists: decodeHtml(item.snippet!.channelTitle || "YouTube"),
        album: "YouTube",
        albumArt: thumbnail(item),
        duration: 0,
        trackUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });
}
