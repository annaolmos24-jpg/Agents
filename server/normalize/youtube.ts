import type { Video } from "../types";
import { arr, compactStats, dedupeById, num, obj, str, toIso } from "../util";

/** Handles trending shorts (`shorts`), search (`shorts` + `videos`) and hashtag search (`videos`). */
export function normalizeYouTube(payload: unknown): Video[] {
  const body = obj(payload);
  const items = [...arr(body.shorts), ...arr(body.videos)];
  return dedupeById(items.map(toVideo).filter((v): v is Video => v !== null));
}

function toVideo(raw: unknown): Video | null {
  const item = obj(raw);
  const id = str(item.id);
  if (!id) return null;

  const channel = obj(item.channel);
  // Search returns handles like "channel/UC..." for channels without an @handle.
  const rawHandle = str(channel.handle) ?? "";
  const handle = rawHandle.startsWith("channel/") ? "" : rawHandle.replace(/^@/, "");

  return {
    id,
    platform: "youtube",
    url: str(item.url) ?? `https://www.youtube.com/watch?v=${id}`,
    thumbnail: str(item.thumbnail) ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    caption: str(item.title) ?? "",
    author: {
      handle: handle || str(channel.title) || "",
      name: str(channel.title),
      avatar: str(channel.thumbnail),
    },
    stats: compactStats({
      views: num(item.viewCount) ?? num(item.viewCountInt),
      likes: num(item.likeCount),
      comments: num(item.commentCount),
    }),
    postedAt: toIso(item.publishDate ?? item.publishedTime),
  };
}
