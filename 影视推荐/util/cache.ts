// util/cache.ts
// 按「来源 + 数量 + 本地日期」缓存最终海报结果。
// 同一天再次刷新/切回来源时直接命中；跨天刷新失败时回退最近一次成功结果。

import { getLocalDayKey } from "./daily";
import type { TrendingItem } from "./settings";

const CACHE_KEY = "MovieTrendingResultCache";

type CacheEntry = {
    day: string;
    items: TrendingItem[];
};

type CacheBucket = {
    day: string;
    // key: `${source}::${length}`
    entries: Record<string, TrendingItem[]>;
    latest: Record<string, CacheEntry>;
};

function cacheKey(source: string, length: number): string {
    return `${source}::${length}`;
}

function readBucket(): CacheBucket {
    const day = getLocalDayKey();
    const raw = Storage.get(CACHE_KEY) as Partial<CacheBucket> | null;
    if (!raw || !raw.entries || typeof raw.entries !== "object") {
        return { day, entries: {}, latest: {} };
    }

    const latest = normalizeLatest(raw.latest);
    const rawDay = typeof raw.day === "string" && raw.day ? raw.day : day;

    // 兼容旧缓存结构：旧 entries 到了第二天不再作为当天缓存，但仍保留为最近可用缓存。
    for (const [key, items] of Object.entries(raw.entries)) {
        if (Array.isArray(items) && items.length > 0 && !latest[key]) {
            latest[key] = {
                day: rawDay,
                items: cloneItems(items),
            };
        }
    }

    return {
        day,
        entries: rawDay === day ? normalizeEntries(raw.entries) : {},
        latest,
    };
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
    return cloneItems(items);
}

export function getFallbackTrending(source: string, length: number): TrendingItem[] | null {
    const bucket = readBucket();
    const entry = bucket.latest[cacheKey(source, length)];
    if (!entry || entry.day === bucket.day || !Array.isArray(entry.items) || entry.items.length === 0) {
        return null;
    }
    console.warn(`[cache fallback] ${source} x${length} 使用 ${entry.day} 的缓存`);
    return cloneItems(entry.items);
}

export function setCachedTrending(source: string, length: number, items: TrendingItem[]): void {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }
    const bucket = readBucket();
    const key = cacheKey(source, length);
    bucket.entries[key] = cloneItems(items);
    bucket.latest[key] = {
        day: bucket.day,
        items: cloneItems(items),
    };
    writeBucket(bucket);
}

/** 有当天缓存直接返回；否则拉数并写入日缓存；刷新失败时回退最近一次成功结果。 */
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
    try {
        const items = await fetcher();
        if (items.length > 0) {
            setCachedTrending(source, length, items);
            return items;
        }

        const fallback = getFallbackTrending(source, length);
        if (fallback) {
            return fallback;
        }
        return [];
    } catch (error) {
        console.error(`[cache refresh failed] ${source} x${length}:`, error);
        const fallback = getFallbackTrending(source, length);
        if (fallback) {
            return fallback;
        }
        return [];
    }
}

/** 配置变更后如需强制刷新，可调用 */
export function clearTrendingCache(): void {
    Storage.remove(CACHE_KEY);
}

function normalizeEntries(entries: Record<string, TrendingItem[]> | undefined): Record<string, TrendingItem[]> {
    const out: Record<string, TrendingItem[]> = {};
    if (!entries || typeof entries !== "object") {
        return out;
    }

    for (const [key, items] of Object.entries(entries)) {
        if (Array.isArray(items) && items.length > 0) {
            out[key] = cloneItems(items);
        }
    }
    return out;
}

function normalizeLatest(latest: Record<string, CacheEntry> | undefined): Record<string, CacheEntry> {
    const out: Record<string, CacheEntry> = {};
    if (!latest || typeof latest !== "object") {
        return out;
    }

    for (const [key, entry] of Object.entries(latest)) {
        if (entry?.day && Array.isArray(entry.items) && entry.items.length > 0) {
            out[key] = {
                day: entry.day,
                items: cloneItems(entry.items),
            };
        }
    }
    return out;
}

function cloneItems(items: TrendingItem[]): TrendingItem[] {
    return items.map((item) => ({ ...item }));
}
