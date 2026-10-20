import type { Video } from "../types";
import { arr, compactStats, dedupeById, firstUrl, num, obj, str, toIso } from "../util";

/** Handles trending (`aweme_list`), hashtag (`aweme_list`) and keyword (`search_item_list[].aweme_info`). */
export function normalizeTikTok(payload: unknown): Video[] {
  const body = obj(payload);
  const items = body.search_item_list
    ? arr(body.search_item_list).map((entry) => obj(entry).aweme_info)
    : arr(body.aweme_list);
  return dedupeById(items.map(toVideo).filter((v): v is Video => v !== null));
}

function toVideo(raw: unknown): Video | null {
  const item = obj(raw);
  const id = str(item.aweme_id) ?? str(item.id_str);
  if (!id) return null;

  const author = obj(item.author);
  const stats = obj(item.statistics);
  const video = obj(item.video);
  const handle = str(author.unique_id) ?? handleFromUrl(str(item.url)) ?? "";

  return {
    id,
    platform: "tiktok",
    url: pickUrl(item, handle, id),
    thumbnail:
      firstUrl(video.cover) ?? firstUrl(video.origin_cover) ?? firstUrl(video.dynamic_cover) ?? null,
    caption: str(item.desc) ?? "",
    author: {
      handle,
      name: str(author.nickname),
      avatar: firstUrl(author.avatar_thumb) ?? firstUrl(author.avatar_medium),
    },
    stats: compactStats({
      views: num(stats.play_count),
      likes: num(stats.digg_count),
      comments: num(stats.comment_count),
      shares: num(stats.share_count),
    }),
    postedAt: toIso(item.create_time),
  };
}

function handleFromUrl(url: string | undefined): string | undefined {
  return url?.match(/tiktok\.com\/@([^/?#]+)/)?.[1];
}

function pickUrl(item: Record<string, unknown>, handle: string, id: string): string {
  // Prefer a URL that actually contains this video's id; fall back to building one.
  for (const candidate of [str(item.url), str(item.share_url)]) {
    if (candidate?.includes(id)) return candidate.split("?")[0];
  }
  return handle
    ? `https://www.tiktok.com/@${handle}/video/${id}`
    : `https://www.tiktok.com/video/${id}`;
}
