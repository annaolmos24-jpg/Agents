import { describe, expect, it } from "vitest";
import { normalizeInstagram } from "../normalize/instagram";
import { normalizeTikTok } from "../normalize/tiktok";
import { normalizeYouTube } from "../normalize/youtube";
import igSearch from "../__fixtures__/instagram-search.json";
import igTrending from "../__fixtures__/instagram-trending.json";
import ttHashtag from "../__fixtures__/tiktok-hashtag.json";
import ttKeyword from "../__fixtures__/tiktok-keyword.json";
import ttTrending from "../__fixtures__/tiktok-trending.json";
import ytHashtag from "../__fixtures__/youtube-hashtag.json";
import ytSearch from "../__fixtures__/youtube-search.json";
import ytTrending from "../__fixtures__/youtube-trending.json";

describe("normalizeTikTok", () => {
  it("maps the trending feed", () => {
    expect(normalizeTikTok(ttTrending)).toEqual([
      {
        id: "7540000301621841183",
        platform: "tiktok",
        url: "https://www.tiktok.com/@breannafriedman0/photo/7540000301621841183",
        thumbnail: "https://p19-pu-sign-useast8.tiktokcdn-us.com/cover-1.webp",
        caption: "#hudsonvalley #fallgetaway #farm #upstateny #resort ",
        author: {
          handle: "breannafriedman0",
          name: "Bre 🤍",
          avatar: "https://p19-pu-sign-useast8.tiktokcdn-us.com/avatar-1.heic",
        },
        stats: { views: 1443873, likes: 71423, comments: 646, shares: 8440 },
        postedAt: "2025-08-18T18:52:13.000Z",
      },
    ]);
  });

  it("unwraps keyword results and prefers the URL matching the video id", () => {
    const [video] = normalizeTikTok(ttKeyword);
    expect(video.id).toBe("7334621391758642478");
    expect(video.author.handle).toBe("kansascitychiefsfan5");
    // `url` in this example points at a different video; share_url matches and is used without tracking params.
    expect(video.url).toBe("https://www.tiktok.com/@kansascitychiefsfan5/video/7334621391758642478");
    expect(video.stats.views).toBe(31677);
  });

  it("builds a URL when none matches the video id", () => {
    const [video] = normalizeTikTok(ttHashtag);
    expect(video.url).toBe("https://www.tiktok.com/@bellapoarch/video/6862153058223197445");
    expect(video.stats.likes).toBe(68933772);
  });
});

describe("normalizeInstagram", () => {
  it("maps trending reels (user + play_count)", () => {
    const [video] = normalizeInstagram(igTrending);
    expect(video).toMatchObject({
      id: "4000819054877393649",
      platform: "instagram",
      url: "https://www.instagram.com/reel/DeFw7uwlMLx/",
      author: { handle: "ufc", name: "UFC" },
      stats: { views: 5112349, likes: 423127, comments: 1623 },
      postedAt: "2026-10-04T23:00:03.000Z",
    });
  });

  it("maps search results (owner, no views)", () => {
    const [video] = normalizeInstagram(igSearch);
    expect(video.author.handle).toBe("fetchmycamera_");
    expect(video.thumbnail).toBe("https://scontent-sjc3-1.cdninstagram.com/thumb.jpg");
    expect(video.stats).toEqual({ likes: 3487, comments: 90 });
  });
});

describe("normalizeYouTube", () => {
  it("maps trending shorts", () => {
    const [video] = normalizeYouTube(ytTrending);
    expect(video).toMatchObject({
      id: "ou0nl5ET0HA",
      author: { handle: "dameuniverse", name: "Dame Universe" },
      stats: { views: 13798774, likes: 151957, comments: 168 },
      postedAt: "2025-08-07T20:00:22.000Z",
    });
  });

  it("puts shorts first in search results and hides channel/UC… handles", () => {
    const videos = normalizeYouTube(ytSearch);
    expect(videos.map((v) => v.id)).toEqual(["uMNvF-lSCHg", "BzSzwqb-OEE"]);
    expect(videos[1].author.handle).toBe("NFrealmusic");
    expect(videos[1].stats.views).toBe(14860541);
  });

  it("maps hashtag results without a channel handle", () => {
    const [video] = normalizeYouTube(ytHashtag);
    expect(video.author.handle).toBe("ZZang Funny");
  });
});

describe("robustness", () => {
  const normalizers = [normalizeTikTok, normalizeInstagram, normalizeYouTube];

  it.each([null, undefined, "nope", 42, [], {}, { aweme_list: "x", reels: {}, shorts: null }])(
    "returns [] for junk input %#",
    (input) => {
      for (const normalize of normalizers) expect(normalize(input)).toEqual([]);
    },
  );

  it("skips items without an id and tolerates missing fields", () => {
    expect(normalizeTikTok({ aweme_list: [{}, { aweme_id: "1" }] })).toEqual([
      {
        id: "1",
        platform: "tiktok",
        url: "https://www.tiktok.com/video/1",
        thumbnail: null,
        caption: "",
        author: { handle: "", name: undefined, avatar: undefined },
        stats: {},
        postedAt: undefined,
      },
    ]);
    expect(normalizeInstagram({ reels: [{ shortcode: "abc" }] })[0].url).toBe(
      "https://www.instagram.com/reel/abc/",
    );
    expect(normalizeYouTube({ videos: [{ id: "x" }] })[0].thumbnail).toBe(
      "https://i.ytimg.com/vi/x/hqdefault.jpg",
    );
  });

  it("removes duplicates (TikTok search can repeat results)", () => {
    const item = ttHashtag.aweme_list[0];
    expect(normalizeTikTok({ aweme_list: [item, item] })).toHaveLength(1);
  });
});

describe("URL safety", () => {
  it("drops non-https or off-platform links and rebuilds safe ones", () => {
    const [ig] = normalizeInstagram({
      reels: [{ id: "1", shortcode: "abc", url: "javascript:alert(1)", image_url: "http://x/y.jpg" }],
    });
    expect(ig.url).toBe("https://www.instagram.com/reel/abc/");
    expect(ig.thumbnail).toBeNull();

    const [yt] = normalizeYouTube({ shorts: [{ id: "q1", url: "https://evil.example/watch?v=q1" }] });
    expect(yt.url).toBe("https://www.youtube.com/watch?v=q1");

    const [tt] = normalizeTikTok({
      aweme_list: [{ aweme_id: "9", url: "https://tiktok.com.evil.example/@x/video/9" }],
    });
    expect(tt.url).toBe("https://www.tiktok.com/video/9");
  });
});
