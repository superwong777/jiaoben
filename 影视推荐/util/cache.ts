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
    // 不足目标数量时不视为完整命中，允许当天继续补齐
    if (!Array.isArray(items) || items.length === 0 || items.length < length) {
        return null;
    }
    // 豆瓣/JavBus：必须有本地文件且磁盘上真实存在
    if (!areItemsUsable(source, items)) {
        console.warn(`[cache invalid] ${source} x${length} 本地海报不可用，重新取数`);
        return null;
    }
    // 返回浅拷贝，避免调用方误改缓存
    return cloneItems(items);
}

export function getFallbackTrending(source: string, length: number): TrendingItem[] | null {
    const bucket = readBucket();
    const entry = bucket.latest[cacheKey(source, length)];
    if (
        !entry ||
        entry.day === bucket.day ||
        !Array.isArray(entry.items) ||
        entry.items.length === 0 ||
        !areItemsUsable(source, entry.items)
    ) {
        return null;
    }
    console.warn(
        `[cache fallback] ${source} x${length} 使用 ${entry.day} 的缓存 (${entry.items.length} 条)`
    );
    return cloneItems(entry.items);
}

export function setCachedTrending(source: string, length: number, items: TrendingItem[]): void {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }
    const bucket = readBucket();
    const key = cacheKey(source, length);
    const existing = bucket.entries[key];
    // 不用不完整结果覆盖更完整的当天缓存
    if (Array.isArray(existing) && existing.length > items.length) {
        return;
    }
    bucket.entries[key] = cloneItems(items);

    const latest = bucket.latest[key];
    if (!latest || latest.day !== bucket.day || latest.items.length <= items.length) {
        bucket.latest[key] = {
            day: bucket.day,
            items: cloneItems(items),
        };
    }
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
            // 完整结果写入日缓存；不足目标数量也先落盘，但下次仍会尝试补齐
            setCachedTrending(source, length, items);
            if (items.length < length) {
                console.warn(
                    `[cache partial] ${source} x${length} 仅拿到 ${items.length} 条，下次刷新会继续补齐`
                );
            }
            return items;
        }

        return pickBestFallback(source, length);
    } catch (error) {
        console.error(`[cache refresh failed] ${source} x${length}:`, error);
        return pickBestFallback(source, length);
    }
}

function pickBestFallback(source: string, length: number): TrendingItem[] {
    const bucket = readBucket();
    const key = cacheKey(source, length);
    const sameDay = bucket.entries[key];
    const latest = bucket.latest[key];

    // 优先使用条数更接近目标的结果，避免“空结果”把半成品覆盖掉
    const candidates: { label: string; items: TrendingItem[] }[] = [];
    if (Array.isArray(sameDay) && sameDay.length > 0 && areItemsUsable(source, sameDay)) {
        candidates.push({ label: `当天不完整缓存 ${sameDay.length} 条`, items: sameDay });
    }
    if (
        latest &&
        Array.isArray(latest.items) &&
        latest.items.length > 0 &&
        latest.day !== bucket.day &&
        areItemsUsable(source, latest.items)
    ) {
        candidates.push({
            label: `${latest.day} 的缓存 ${latest.items.length} 条`,
            items: latest.items,
        });
    }

    if (candidates.length === 0) {
        return [];
    }

    candidates.sort((a, b) => {
        const da = Math.abs(a.items.length - length) - Math.abs(b.items.length - length);
        if (da !== 0) return da;
        return b.items.length - a.items.length;
    });

    const best = candidates[0];
    console.warn(`[cache fallback] ${source} x${length} 使用 ${best.label}`);
    return cloneItems(best.items);
}

/** 配置变更后如需强制刷新，可调用 */
export function clearTrendingCache(): void {
    Storage.remove(CACHE_KEY);
}

/**
 * 收集缓存中仍引用的本地海报路径（entries + latest）。
 * 清理目录时并入 keep 列表，避免小尺寸刷新删掉中尺寸还在用的图。
 */
export function collectCachedImagePaths(...sources: string[]): string[] {
    if (sources.length === 0) {
        return [];
    }
    const allowed = new Set(sources.map((s) => s.split("::")[0]));
    const bucket = readBucket();
    const paths: string[] = [];

    const visit = (items: TrendingItem[] | undefined) => {
        if (!Array.isArray(items)) return;
        for (const item of items) {
            if (item?.imagePath) {
                paths.push(item.imagePath);
            }
        }
    };

    for (const [key, items] of Object.entries(bucket.entries)) {
        if (allowed.has(key.split("::")[0])) {
            visit(items);
        }
    }
    for (const [key, entry] of Object.entries(bucket.latest)) {
        if (allowed.has(key.split("::")[0])) {
            visit(entry?.items);
        }
    }
    return paths;
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

/**
 * 本地优先源（豆瓣/JavBus）必须有 imagePath，且文件真实存在。
 * 旧缓存只有远程 imageUrl，或本地文件被删，均视为不可用。
 */
function areItemsUsable(source: string, items: TrendingItem[]): boolean {
    const normalized = (source || "").split("::")[0];
    if (normalized !== "豆瓣" && normalized !== "JavBus") {
        return true;
    }
    return items.every((item) => {
        const path = item?.imagePath;
        if (!path) {
            return false;
        }
        try {
            return FileManager.existsSync(path);
        } catch {
            return false;
        }
    });
}
