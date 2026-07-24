// util/settings.ts
// 统一设置读写与来源解析，避免 pages 模块 import 时产生副作用。

import type { DynamicShapeStyle, ShapeStyle } from "scripting";
import { getLocalDayKey } from "./daily";

export type ThemeMode = "auto" | "light" | "dark";

export type EmbyData = {
    addr: string;
    key: string;
};

export type Settings = {
    source: string;
    current: number;
    /** 轮播最近一次推进的本地日期 YYYY-MM-DD；同一天内不重复切源 */
    carouselDay: string;
    isCarousel: boolean;
    isAdult: boolean;
    themeMode: ThemeMode;
    emby: EmbyData;
};

export type ResolvedTheme = {
    mode: ThemeMode;
    widgetBackground: DynamicShapeStyle;
    labelColor: ShapeStyle | DynamicShapeStyle;
};

export type TrendingItem = {
    imageUrl?: string;
    imagePath?: string;
    openUrl: string;
};

const storageKey = "MovieTrendingSetting";

export const SOURCES_ALL = ["豆瓣", "Trakt", "Emby", "JavBus", "MissAV"] as const;
export const SOURCES_SAFE = SOURCES_ALL.slice(0, 3);
export const DEFAULT_SOURCE = "豆瓣";

const DEFAULT_SETTINGS: Settings = {
    source: DEFAULT_SOURCE,
    current: 0,
    carouselDay: "",
    isCarousel: false,
    isAdult: false,
    themeMode: "auto",
    emby: {
        addr: "",
        key: "",
    },
};

const LIGHT_BG: ShapeStyle = "rgb(255, 255, 255)";
const DARK_BG: ShapeStyle = "rgb(28, 28, 30)";
const LIGHT_LABEL: ShapeStyle = "rgb(60, 60, 67)";
const DARK_LABEL: ShapeStyle = "rgb(235, 235, 245)";

export function getSettings(): Settings {
    const raw = (Storage.get(storageKey) as Partial<Settings> | null) ?? null;
    if (!raw) {
        return cloneSettings(DEFAULT_SETTINGS);
    }

    const themeMode: ThemeMode =
        raw.themeMode === "light" || raw.themeMode === "dark" || raw.themeMode === "auto"
            ? raw.themeMode
            : "auto";

    return {
        source: typeof raw.source === "string" && raw.source.trim() ? raw.source : DEFAULT_SOURCE,
        current: Number.isFinite(raw.current as number) ? Number(raw.current) : 0,
        carouselDay: typeof raw.carouselDay === "string" ? raw.carouselDay : "",
        isCarousel: Boolean(raw.isCarousel),
        isAdult: Boolean(raw.isAdult),
        themeMode,
        emby: {
            addr: raw.emby?.addr ?? "",
            key: raw.emby?.key ?? "",
        },
    };
}

export function setSettings(settings: Settings): void {
    Storage.set(storageKey, settings);
}

export function getSources(isAdult: boolean): string[] {
    return isAdult ? [...SOURCES_ALL] : [...SOURCES_SAFE];
}

export function isEmbyConfigured(emby: EmbyData): boolean {
    return Boolean(emby?.addr?.trim() && emby?.key?.trim());
}

/** 轮播可用来源：按成人开关过滤，并跳过未配置的 Emby */
export function getCarouselSources(settings: Settings): string[] {
    return getSources(settings.isAdult).filter((source) => {
        if (source === "Emby") {
            return isEmbyConfigured(settings.emby);
        }
        return true;
    });
}

/**
 * 解析当前应展示的来源。
 * 轮播模式下：
 * - advance=true 且本地日期相对上次推进已跨天 → 切到下一个源并写回
 * - 同一天内重复刷新 → 保持当前源，不切
 */
export function resolveActiveSource(settings: Settings, advance = false): { type: string; settings: Settings } {
    if (!settings.isCarousel) {
        const type = normalizeSource(settings.source, settings);
        return { type, settings };
    }

    const pool = getCarouselSources(settings);
    if (pool.length === 0) {
        return { type: DEFAULT_SOURCE, settings };
    }

    let index = settings.current || 0;
    if (index < 0 || index >= pool.length) {
        index = 0;
    }

    const today = getLocalDayKey();
    const shouldAdvance = advance && settings.carouselDay !== today;

    if (shouldAdvance) {
        // 首次启用轮播（carouselDay 为空）时先锚定到当天，不立刻跳源
        if (!settings.carouselDay) {
            const nextSettings: Settings = { ...settings, current: index, carouselDay: today };
            setSettings(nextSettings);
            console.log(`[carousel] 锚定当天源 ${pool[index]} @ ${today}`);
            return { type: pool[index], settings: nextSettings };
        }

        index = (index + 1) % pool.length;
        const nextSettings: Settings = { ...settings, current: index, carouselDay: today };
        setSettings(nextSettings);
        console.log(`[carousel] 跨日推进 → ${pool[index]} @ ${today}`);
        return { type: pool[index], settings: nextSettings };
    }

    // 同一天内刷新：若 current 越界则纠正，但不改 carouselDay
    if (index !== settings.current) {
        const nextSettings: Settings = { ...settings, current: index };
        setSettings(nextSettings);
        return { type: pool[index], settings: nextSettings };
    }

    return { type: pool[index], settings };
}

export function resolveTheme(mode: ThemeMode = "auto"): ResolvedTheme {
    if (mode === "light") {
        return {
            mode,
            widgetBackground: { light: LIGHT_BG, dark: LIGHT_BG },
            labelColor: LIGHT_LABEL,
        };
    }
    if (mode === "dark") {
        return {
            mode,
            widgetBackground: { light: DARK_BG, dark: DARK_BG },
            labelColor: DARK_LABEL,
        };
    }
    return {
        mode: "auto",
        widgetBackground: { light: LIGHT_BG, dark: DARK_BG },
        // 跟随系统语义色
        labelColor: "secondaryLabel",
    };
}

export function themeModeLabel(mode: ThemeMode): string {
    switch (mode) {
        case "light":
            return "强制浅色";
        case "dark":
            return "强制深色";
        default:
            return "自动适应";
    }
}

function normalizeSource(source: string, settings: Settings): string {
    const value = (source || "").trim();
    if (!value) {
        return DEFAULT_SOURCE;
    }
    const allowed = getSources(settings.isAdult);
    if (!allowed.includes(value)) {
        return DEFAULT_SOURCE;
    }
    return value;
}

function cloneSettings(settings: Settings): Settings {
    return {
        ...settings,
        emby: { ...settings.emby },
    };
}
