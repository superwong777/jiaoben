import { fetchJson } from "./http";
import { pickDailyItems } from "./daily";
import { TMDB } from "./class/tmdb";
import type { TrendingItem } from "./settings";

export async function getTraktTrending(length: number): Promise<TrendingItem[]> {
    try {
        const result = await fetchJson<any[]>(
            "https://api.trakt.tv/movies/trending",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "trakt-api-version": "2",
                    "trakt-api-key": "635bd6cf7c0dc768d4361416e1104dde07fa2a11c9f4551df049a6759e0a6c78",
                },
            },
            "Trakt"
        );

        if (!Array.isArray(result) || result.length === 0) {
            return [];
        }

        // 只多取少量缓冲，避免串行/过多 TMDB 详情请求
        const candidateCount = Math.min(Math.max(length + 2, length), result.length);
        const dailyRaw = pickDailyItems(result, candidateCount, "trakt");
        const tmdb = TMDB.getInstance();

        const settled = await Promise.all(
            dailyRaw.map(async (item: any): Promise<TrendingItem | null> => {
                try {
                    const ids = item?.movie?.ids;
                    if (!ids?.tmdb || !ids?.slug) {
                        return null;
                    }
                    const { poster_path } = await tmdb.getMovieDetails(ids.tmdb);
                    const imageUrl = tmdb.getImageUrl(poster_path);
                    if (!imageUrl) {
                        return null;
                    }
                    return {
                        imageUrl,
                        openUrl: `https://trakt.tv/movies/${ids.slug}`,
                    };
                } catch (err) {
                    console.warn("Trakt 单项处理失败:", err);
                    return null;
                }
            })
        );

        return settled.filter(Boolean).slice(0, length) as TrendingItem[];
    } catch (e) {
        console.error("getTraktTrending 失败:", e);
        return [];
    }
}
