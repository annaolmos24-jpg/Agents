import { describe, expect, it } from "vitest";
import { formatAgo, formatCount } from "../format";
import { sortVideos } from "../sort";
import type { Video } from "../types";

const v = (id: string, stats: Video["stats"], postedAt?: string): Video => ({
  id,
  platform: "tiktok",
  url: `https://example.com/${id}`,
  thumbnail: null,
  caption: "",
  author: { handle: "" },
  stats,
  postedAt,
});

describe("sortVideos", () => {
  const videos = [
    v("a", { views: 10, likes: 5 }, "2026-01-01T00:00:00Z"),
    v("b", { likes: 50 }),
    v("c", { views: 1000, likes: 1 }, "2026-06-01T00:00:00Z"),
  ];

  it("sorts by views with unknown values last", () => {
    expect(sortVideos(videos, "views").map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by likes and by newest", () => {
    expect(sortVideos(videos, "likes").map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(sortVideos(videos, "newest").map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input", () => {
    sortVideos(videos, "views");
    expect(videos.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("format", () => {
  it("formats counts compactly", () => {
    expect(formatCount(1_443_873)).toBe("1.4M");
    expect(formatCount(950)).toBe("950");
    expect(formatCount(undefined)).toBeNull();
  });

  it("formats relative times", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    expect(formatAgo("2026-10-18T12:00:00Z", now)).toBe("2 days ago");
    expect(formatAgo("2026-10-20T11:59:30Z", now)).toBe("just now");
    expect(formatAgo("not a date", now)).toBeNull();
    expect(formatAgo(undefined, now)).toBeNull();
  });
});
