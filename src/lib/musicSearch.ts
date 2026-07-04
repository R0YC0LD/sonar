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

interface YoutubeVideoItem {
  id?: string;
  snippet?: YoutubeSearchItem["snippet"];
  contentDetails?: {
    duration?: string;
  };
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
    uploadStatus?: string;
  };
}

function decodeHtml(value: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = value;
  return el.value;
}

function thumbnail(item: { snippet?: YoutubeSearchItem["snippet"] }): string {
  return (
    item.snippet?.thumbnails?.high?.url ||
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.default?.url ||
    ""
  );
}

function parseDuration(value?: string): number {
  if (!value) return 0;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
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
    maxResults: "25",
    videoEmbeddable: "true",
    safeSearch: "none",
    videoCategoryId: "10",
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error("YouTube aramasi basarisiz oldu. API key, kota veya referrer ayarlarini kontrol et.");
  }

  const data = (await res.json()) as { items?: YoutubeSearchItem[] };
  const searchItems = (data.items || [])
    .filter((item) => item.id?.videoId && item.snippet?.title)
    .slice(0, 18);

  const ids = searchItems.map((item) => item.id!.videoId!).join(",");
  if (!ids) return [];

  const videoParams = new URLSearchParams({
    key: API_KEY,
    part: "snippet,contentDetails,status",
    id: ids,
    maxResults: "18",
  });
  const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${videoParams.toString()}`);
  if (!videoRes.ok) {
    throw new Error("YouTube video bilgileri alinamadi. API key veya kota ayarlarini kontrol et.");
  }

  const videoData = (await videoRes.json()) as { items?: YoutubeVideoItem[] };
  const videosById = new Map((videoData.items || []).map((item) => [item.id, item]));

  return searchItems
    .map((item) => videosById.get(item.id!.videoId!))
    .filter((item): item is YoutubeVideoItem => {
      if (!item?.id || !item.snippet?.title) return false;
      return (
        item.status?.embeddable === true &&
        item.status?.privacyStatus === "public" &&
        item.status?.uploadStatus === "processed"
      );
    })
    .map((item) => {
      const videoId = item.id!;
      return {
        id: videoId,
        provider: "youtube" as const,
        videoId,
        title: decodeHtml(item.snippet!.title || "YouTube videosu"),
        artists: decodeHtml(item.snippet!.channelTitle || "YouTube"),
        album: "YouTube",
        albumArt: thumbnail(item),
        duration: parseDuration(item.contentDetails?.duration),
        trackUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });
}
