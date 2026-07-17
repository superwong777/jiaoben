import { fetchJson } from "./http";
import { pickDailyItems } from "./daily";
import type { TrendingItem } from "./settings";

// 日更足够用，不必每次固定拉 24 条；小尺寸 1 张也只需少量候选
const DOUBAN_POOL = 12;

export async function getDoubanTrending(length: number): Promise<TrendingItem[]> {
    try {
        const poolSize = Math.max(length, DOUBAN_POOL);
        const data = await fetchJson<{ subject_collection_items?: any[] }>(
            `https://m.douban.com/rexxar/api/v2/subject_collection/movie_showing/items?start=0&count=${poolSize}&updated_at=&items_only=1&for_mobile=1`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Host: "m.douban.com",
                    Referer: "https://m.douban.com/subject_collection/movie_hot_gaia",
                },
            },
            "豆瓣"
        );

        const items = Array.isArray(data?.subject_collection_items) ? data.subject_collection_items : [];
        const mapped: TrendingItem[] = items
            .map((item: any) => ({
                imageUrl: item?.cover?.url,
                openUrl: item?.url,
            }))
            .filter((item) => Boolean(item.imageUrl && item.openUrl));

        return pickDailyItems(mapped, length, "douban");
    } catch (e) {
        console.error("getDoubanTrending 失败:", e);
        return [];
    }
}
