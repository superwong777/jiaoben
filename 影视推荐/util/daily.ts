// util/daily.ts
// 按本地日历日做稳定抽样：同一天结果一致，跨天自动换一组。

/** 本地日期键 YYYY-MM-DD（跟随设备时区，国内即 Asia/Shanghai） */
export function getLocalDayKey(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** 简单稳定哈希 → 非负整数 */
export function hashString(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function dayOffset(mod: number, salt = "", dayKey: string = getLocalDayKey()): number {
    if (!mod || mod <= 0) {
        return 0;
    }
    return hashString(`${dayKey}::${salt}`) % mod;
}

/**
 * 从候选池中按「当天」稳定截取 length 条（环形）。
 * - 同一天 + 同一 salt → 同一组
 * - 换天 → 起点偏移变化 → 新图
 */
export function pickDailyItems<T>(items: T[], length: number, salt: string): T[] {
    if (!Array.isArray(items) || items.length === 0 || length <= 0) {
        return [];
    }

    const count = Math.min(length, items.length);
    const start = dayOffset(items.length, salt);
    const result: T[] = [];
    for (let i = 0; i < count; i++) {
        result.push(items[(start + i) % items.length]);
    }
    return result;
}

/** 各源拉候选池的建议上限（越大日更变化空间越大，请求也越重） */
export const DAILY_POOL_SIZE = 24;
