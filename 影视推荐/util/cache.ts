// util/cache.ts
// 按「来源 + 数量 + 本地日期」缓存最终海报结果。
// 同一天再次刷新/切回来源时直接命中，显著缩短等待。

import { getLocalDayKey } from "./daily";
import type { TrendingItem } from "./settings";

const CACHE_KEY = "MovieTrendingResultCache";

type CacheBucket = {
    day: string;
    // key: `${source}::${length}`
    entries: Record<string, TrendingItem[]>;
};

function cacheKey(source: string, length: number): string {
    return `${source}::${length}`;
}

function readBucket(): CacheBucket {
    const day = getLocalDayKey();
    const raw = Storage.get(CACHE_KEY) as CacheBucket | null;
    if (!raw || raw.day !== day || !raw.entries || typeof raw.entries !== "object") {
        return { day, entries: {} };
    }
    return raw;
}

function writeBucket(bucket: CacheBucket): void {
    Storage.set(CACHE_KEY, bucket);
}

export function getCachedTrending(source: string, length: number): TrendingItem[] | null {
    const bucket = readBucket();
    const items = bucket.entries[cacheKey(source, length)];
    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }
    // 返回浅拷贝，避免调用方误改缓存
    return items.map((item) => ({ ...item }));
}

export function setCachedTrending(source: string, length: number, items: TrendingItem[]): void {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }
    const bucket = readBucket();
    bucket.entries[cacheKey(source, length)] = items.map((item) => ({ ...item }));
    writeBucket(bucket);
}

/** 有缓存直接返回；否则拉数并写入日缓存 */
export async function withDailyCache(
    source: string,
    length: number,
    fetcher: () => Promise<TrendingItem[]>
): Promise<TrendingItem[]> {
    const cached = getCachedTrending(source, length);
    if (cached) {
        console.log(`[cache hit] ${source} x${length} @ ${getLocalDayKey()}`);
        return cached;
    }

    console.log(`[cache miss] ${source} x${length}，开始取数`);
    const items = await fetcher();
    if (items.length > 0) {
        setCachedTrending(source, length, items);
    }
    return items;
}

/** 配置变更后如需强制刷新，可调用 */
export function clearTrendingCache(): void {
    Storage.remove(CACHE_KEY);
}
