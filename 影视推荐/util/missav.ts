import { pickDailyItems } from "./daily";
import type { TrendingItem } from "./settings";

// WebView 冷启动本身很慢；只解析首页靠前的卡片即可
const MISSAV_POOL = 12;

export async function getMissAVTrending(length: number): Promise<TrendingItem[]> {
    let wv: any = null;
    try {
        wv = new WebViewController();
        await wv.loadURL("https://missav.ai");
        await wv.waitForLoad();

        const result = await wv.evaluateJavaScript(`
            const divs = document.querySelectorAll('div.relative.aspect-w-16.aspect-h-9.rounded.overflow-hidden.shadow-lg');
            const limit = ${MISSAV_POOL};
            const out = [];
            for (let i = 0; i < divs.length && out.length < limit; i++) {
                const a = divs[i].querySelector('a[href]');
                if (!a) continue;
                const img = a.querySelector('img');
                const src = img ? (img.dataset.src || img.getAttribute('src')) : null;
                const href = a.getAttribute('href');
                if (!src || !href || src === 'javascript:;' || href === 'javascript:;') continue;
                out.push({ imageUrl: src, openUrl: href });
            }
            return out;
        `);

        const items = (Array.isArray(result) ? result : []).filter(
            (item: any) => item?.imageUrl && item?.openUrl
        ) as TrendingItem[];

        return pickDailyItems(items, length, "missav");
    } catch (e) {
        console.error("getMissAVTrending 失败:", e);
        return [];
    } finally {
        try {
            wv?.dispose?.();
            wv?.close?.();
            wv?.destroy?.();
        } catch {
            // ignore cleanup errors
        }
    }
}
