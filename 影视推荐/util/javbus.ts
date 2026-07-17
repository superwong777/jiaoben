import { Script, Path } from "scripting";
import { fetchBytes, fetchJson } from "./http";
import { hashString, pickDailyItems } from "./daily";
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
        // 日更只需要 length 条，不必再扩到整个 pool 再 slice
        const daily = pickDailyItems(result, length, "javbus");
        const rootPath = await ensureJavBusDir();

        const tasks = daily.map(async (item: any, index: number) => {
            try {
                let cleanSrc = item.src || "";
                if (cleanSrc.includes("javbus.com//pics")) {
                    cleanSrc = cleanSrc.replace("javbus.com//pics", "javbus.com/pics");
                }

                const path = await setJavBusImage(cleanSrc, item.link, rootPath);
                if (path) {
                    return {
                        openUrl: item.link,
                        imagePath: path,
                    } as TrendingItem;
                }
                return {
                    openUrl: item.link,
                    imageUrl: cleanSrc,
                } as TrendingItem;
            } catch (singleErr) {
                console.warn(`第 ${index} 张图下载异常，降级直连网络地址:`, singleErr);
                return {
                    openUrl: item.link,
                    imageUrl: item.src,
                } as TrendingItem;
            }
        });

        const finalResult = await Promise.all(tasks);
        console.log("JavBus 数据处理完成:", JSON.stringify(finalResult));
        return finalResult.filter((item) => Boolean(item.openUrl && (item.imagePath || item.imageUrl)));
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
