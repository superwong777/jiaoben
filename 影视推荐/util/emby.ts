import { fetchJson } from "./http";
import { DAILY_POOL_SIZE, pickDailyItems } from "./daily";
import { getSettings, isEmbyConfigured, type TrendingItem } from "./settings";

const USER_CACHE_KEY = "MovieTrendingEmbyUser";

type EmbyUserCache = {
    addr: string;
    key: string;
    userId: string;
};

export async function getEmbyTrending(length: number): Promise<TrendingItem[]> {
    try {
        const { emby } = getSettings();
        const addr = (emby.addr || "").replace(/\/+$/, "");
        const key = emby.key || "";

        if (!isEmbyConfigured({ addr, key })) {
            console.warn("Emby 未配置地址或 API Key");
            return [];
        }

        const userid = await getUserid(addr, key);
        const result = await fetchJson<any[]>(
            `${addr}/Users/${userid}/Items/Latest`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-Emby-Token": key,
                },
            },
            "Emby"
        );

        if (!Array.isArray(result) || result.length === 0) {
            return [];
        }

        const pool = result.slice(0, Math.max(length, DAILY_POOL_SIZE));
        const mapped: TrendingItem[] = pool
            .map((item: any) => {
                if (!item?.Id) {
                    return null;
                }
                return {
                    imageUrl: getEmbyImageUrl(addr, item.Id),
                    openUrl: getEmbyOpenUrl(addr, item.Id, item.ServerId),
                };
            })
            .filter(Boolean) as TrendingItem[];

        return pickDailyItems(mapped, length, "emby");
    } catch (e) {
        console.error("getEmbyTrending 失败:", e);
        return [];
    }
}

async function getUserid(addr: string, key: string): Promise<string> {
    const cached = Storage.get(USER_CACHE_KEY) as EmbyUserCache | null;
    if (cached?.userId && cached.addr === addr && cached.key === key) {
        return cached.userId;
    }

    const result = await fetchJson<any[]>(
        `${addr}/Users/Public`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-Emby-Token": key,
            },
        },
        "Emby Users"
    );

    const id = result?.[0]?.Id;
    if (!id) {
        throw new Error("Emby 未返回可用用户");
    }

    Storage.set(USER_CACHE_KEY, { addr, key, userId: id } satisfies EmbyUserCache);
    return id;
}

function getEmbyImageUrl(addr: string, itemid: string): string {
    return `${addr}/Items/${itemid}/Images/Primary?maxWidth=500&quality=90`;
}

function getEmbyOpenUrl(addr: string, itemid: string, serverid: string): string {
    return `${addr}/web/index.html#!/item?id=${itemid}&serverId=${serverid}`;
}
