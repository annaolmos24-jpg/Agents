import type { Video } from "../types";
import { arr, compactStats, dedupeById, num, obj, safeUrl, str, toIso } from "../util";

/** Handles trending reels (`reels[].user`) and reel search (`reels[].owner`). */
export function normalizeInstagram(payload: unknown): Video[] {
  return dedupeById(
    arr(obj(payload).reels)
      .map(toVideo)
      .filter((v): v is Video => v !== null),
  );
}

function toVideo(raw: unknown): Video | null {
  const item = obj(raw);
  const id = str(item.id) ?? str(item.shortcode);
  if (!id) return null;

  const owner = obj(item.user ?? item.owner);
  const shortcode = str(item.shortcode);
  const url =
    safeUrl(item.url, ["instagram.com"]) ??
    (shortcode ? `https://www.instagram.com/reel/${encodeURIComponent(shortcode)}/` : undefined);
  if (!url) return null;

  return {
    id,
    platform: "instagram",
    url,
    thumbnail:
      safeUrl(item.image_url) ?? safeUrl(item.thumbnail_src) ?? safeUrl(item.display_url) ?? null,
    caption: str(item.caption) ?? "",
    author: {
      handle: str(owner.username) ?? "",
      name: str(owner.full_name),
      avatar: safeUrl(owner.profile_pic_url),
    },
    stats: compactStats({
      views: num(item.play_count) ?? num(item.video_view_count),
      likes: num(item.like_count),
      comments: num(item.comment_count),
    }),
    postedAt: toIso(item.taken_at),
  };
}
