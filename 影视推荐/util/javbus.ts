import { Script, Path } from "scripting";
import { fetchBytes, fetchJson } from "./http";
import { hashString, pickDailyItems } from "./daily";
import { collectCachedImagePaths } from "./cache";
import { pruneImageDir } from "./localImage";
import type { TrendingItem } from "./settings";

export async function getJavBusTrending(length: number): Promise<TrendingItem[]> {
    try {
        console.log("正在请求 GitLab 备份源...");
        const result = await fetchJson<any[]>(
            "https://gitlab.com/Nicked639/javrev/raw/master/RecBot",
            undefined,
            "JavBus"
        );

        if (!Array.isArray(result) || result.length === 0) {
            return [];
        }

        console.log(`成功获取数据，条数: ${result.length}`);

        // 多取缓冲：今天可能抽到 javbus.org 等 401 图源，失败后继续往后补
        const candidateCount = Math.min(Math.max(length * 3, length + 6), result.length);
        const daily = pickDailyItems(result, candidateCount, "javbus");
        const rootPath = await ensureJavBusDir();

        const items: TrendingItem[] = [];
        for (let index = 0; index < daily.length && items.length < length; index++) {
            const item = daily[index];
            const openUrl = typeof item?.link === "string" ? item.link.trim() : "";
            let cleanSrc = typeof item?.src === "string" ? item.src.trim() : "";
            if (!openUrl || !cleanSrc) {
                console.warn(`第 ${index} 条缺少 link/src，跳过`);
                continue;
            }

            if (cleanSrc.includes("javbus.com//pics")) {
                cleanSrc = cleanSrc.replace("javbus.com//pics", "javbus.com/pics");
            }

            try {
                const path = await setJavBusImage(cleanSrc, openUrl, rootPath);
                if (path) {
                    items.push({
                        openUrl,
                        imagePath: path,
                    });
                    continue;
                }

                // 本地下载失败（常见 401/防盗链）时不要塞失效远程图，直接换下一条
                console.warn(`第 ${index} 张图下载失败，换下一条候选: ${cleanSrc}`);
            } catch (singleErr) {
                console.warn(`第 ${index} 张图处理异常，换下一条候选:`, singleErr);
            }
        }

        console.log(`JavBus 数据处理完成: ${items.length}/${length}`);

        // 只保留本轮 + 缓存仍引用的本地图，避免 image/javbus 膨胀
        if (items.length > 0) {
            const keep = [
                ...items.map((item) => item.imagePath || ""),
                ...collectCachedImagePaths("JavBus"),
            ];
            await pruneImageDir(rootPath, keep);
        }

        return items;
    } catch (e) {
        console.error("getJavBusTrending 发生致命错误:", e);
        return [];
    }
}

async function ensureJavBusDir(): Promise<string> {
    const rootPath = Path.join(Script.directory, "image", "javbus");
    if (!(await FileManager.exists(rootPath))) {
        await FileManager.createDirectory(rootPath);
    }
    return rootPath;
}

async function setJavBusImage(url: string, referer: string, rootPath: string): Promise<string> {
    try {
        if (!url) {
            return "";
        }

        // 按 URL 哈希缓存：同图二次加载直接复用，不再下载
        const fileName = `${hashString(url).toString(16)}.jpg`;
        const path = Path.join(rootPath, fileName);
        if (await FileManager.exists(path)) {
            console.log(`命中本地图缓存: ${fileName}`);
            return path;
        }

        const data = await fetchBytes(
            url,
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                    Referer: referer,
                    Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
                },
            },
            "JavBus 图片"
        );

        await FileManager.writeAsBytes(path, data);
        console.log(`本地保存成功: ${path}`);
        return path;
    } catch (err) {
        console.error(`保存图片时发生错误:`, err);
        return "";
    }
}
