import { Script, Path } from "scripting";
import { fetchBytes, fetchJson } from "./http";
import { hashString, pickDailyItems } from "./daily";
import { collectCachedImagePaths } from "./cache";
import { pruneImageDir } from "./localImage";
import type { TrendingItem } from "./settings";

// 日更足够用；多取缓冲，个别封面下载失败可换下一条
const DOUBAN_POOL = 12;

export async function getDoubanTrending(length: number): Promise<TrendingItem[]> {
    try {
        // 多取候选：doubanio 偶发失败时继续往后补
        const poolSize = Math.min(Math.max(length * 3, DOUBAN_POOL), 24);
        const data = await fetchJson<{ subject_collection_items?: any[] }>(
            `https://m.douban.com/rexxar/api/v2/subject_collection/movie_showing/items?start=0&count=${poolSize}&updated_at=&items_only=1&for_mobile=1`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Host: "m.douban.com",
                    Referer: "https://m.douban.com/subject_collection/movie_hot_gaia",
                    "User-Agent":
                        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                },
            },
            "豆瓣"
        );

        const raw = Array.isArray(data?.subject_collection_items) ? data.subject_collection_items : [];
        const candidates = raw
            .map((item: any) => ({
                imageUrl: typeof item?.cover?.url === "string" ? item.cover.url.trim() : "",
                openUrl: typeof item?.url === "string" ? item.url.trim() : "",
            }))
            .filter((item) => Boolean(item.imageUrl && item.openUrl));

        if (candidates.length === 0) {
            return [];
        }

        // 先按日稳定抽样候选池，再逐一下载，凑够 length
        const candidateCount = Math.min(Math.max(length * 3, length + 6), candidates.length);
        const daily = pickDailyItems(candidates, candidateCount, "douban");
        const rootPath = await ensureDoubanDir();

        const items: TrendingItem[] = [];
        for (let index = 0; index < daily.length && items.length < length; index++) {
            const item = daily[index];
            try {
                const path = await setDoubanImage(item.imageUrl, item.openUrl, rootPath);
                if (path) {
                    items.push({
                        openUrl: item.openUrl,
                        imagePath: path,
                    });
                    continue;
                }
                console.warn(`豆瓣第 ${index} 张图下载失败，换下一条: ${item.imageUrl}`);
            } catch (singleErr) {
                console.warn(`豆瓣第 ${index} 张图处理异常，换下一条:`, singleErr);
            }
        }

        console.log(`豆瓣数据处理完成: ${items.length}/${length}`);

        // 只保留本轮 + 缓存仍引用的本地图，避免 image/douban 膨胀
        if (items.length > 0) {
            const keep = [
                ...items.map((item) => item.imagePath || ""),
                ...collectCachedImagePaths("豆瓣"),
            ];
            await pruneImageDir(rootPath, keep);
        }

        return items;
    } catch (e) {
        console.error("getDoubanTrending 失败:", e);
        return [];
    }
}

async function ensureDoubanDir(): Promise<string> {
    const rootPath = Path.join(Script.directory, "image", "douban");
    if (!(await FileManager.exists(rootPath))) {
        await FileManager.createDirectory(rootPath);
    }
    return rootPath;
}

async function setDoubanImage(url: string, referer: string, rootPath: string): Promise<string> {
    try {
        if (!url) {
            return "";
        }

        // 按 URL 哈希缓存：同图二次加载直接复用
        const fileName = `${hashString(url).toString(16)}.jpg`;
        const path = Path.join(rootPath, fileName);
        if (await FileManager.exists(path)) {
            console.log(`命中豆瓣本地图缓存: ${fileName}`);
            return path;
        }

        // 豆瓣 CDN 防盗链：裸请求会 418，必须带 Referer
        const data = await fetchBytes(
            url,
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                    Referer: referer || "https://m.douban.com/",
                    Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
                },
            },
            "豆瓣图片"
        );

        await FileManager.writeAsBytes(path, data);
        console.log(`豆瓣本地保存成功: ${path}`);
        return path;
    } catch (err) {
        console.error("保存豆瓣图片时发生错误:", err);
        return "";
    }
}
