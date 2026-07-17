import { Widget, Text } from "scripting";
import { getTraktTrending } from "./util/trakt";
import { getDoubanTrending } from "./util/douban";
import { getEmbyTrending } from "./util/emby";
import { getJavBusTrending } from "./util/javbus";
import { getMissAVTrending } from "./util/missav";
import { View as VerticalView } from "./widget/generalVertical";
import { View as HorizontalView } from "./widget/generalHorizontal";
import {
    DEFAULT_SOURCE,
    getSettings,
    resolveActiveSource,
    resolveTheme,
    type TrendingItem,
} from "./util/settings";
import { getLocalDayKey, hashString } from "./util/daily";
import { withDailyCache } from "./util/cache";

(async () => {
    try {
        const settings = getSettings();
        // 轮播：仅在小组件刷新时显式推进，避免 import 副作用
        const { type: activeType } = resolveActiveSource(settings, settings.isCarousel);
        const theme = resolveTheme(settings.themeMode);
        const length = Widget.family === "systemSmall" ? 1 : 3;

        console.log(
            `影视推荐刷新 | 源=${activeType} | 主题=${theme.mode} | 日期=${getLocalDayKey()} | family=${Widget.family}`
        );

        const result = await getTrending(activeType, length);

        if (!result || result.length === 0) {
            Widget.present(
                <Text font={13} foregroundStyle={theme.labelColor} padding widgetBackground={theme.widgetBackground}>
                    暂无数据，请尝试手动刷新或检查网络。
                </Text>
            );
            return;
        }

        if (activeType === "MissAV") {
            Widget.present(<HorizontalView data={result} theme={theme} sourceType={activeType} />);
        } else {
            Widget.present(<VerticalView data={result} theme={theme} sourceType={activeType} />);
        }
    } catch (error: any) {
        console.error("widget 渲染失败:", error);
        Widget.present(
            <Text font={12} foregroundStyle="red" padding>
                运行出错: {String(error?.message || error)}
            </Text>
        );
    }
})().catch((e) => {
    console.error("最外层异常捕获:", e);
    Widget.present(
        <Text font={12} foregroundStyle="red" padding>
            {String(e)}
        </Text>
    );
});

async function getTrending(type: string, length: number): Promise<TrendingItem[]> {
    const normalized = (type || "").trim() || DEFAULT_SOURCE;

    const cacheSource = getCacheSource(normalized);

    return withDailyCache(cacheSource, length, async () => {
        switch (normalized) {
            case "Trakt":
                return await getTraktTrending(length);
            case "豆瓣":
                return await getDoubanTrending(length);
            case "Emby":
                return await getEmbyTrending(length);
            case "JavBus":
                return await getJavBusTrending(length);
            case "MissAV":
                return await getMissAVTrending(length);
            default:
                console.warn(`未知来源 ${normalized}，回退豆瓣`);
                return await getDoubanTrending(length);
        }
    });
}

function getCacheSource(source: string): string {
    if (source !== "Emby") {
        return source;
    }
    const { emby } = getSettings();
    const sig = hashString(`${emby.addr || ""}::${emby.key || ""}`).toString(16);
    return `Emby::${sig}`;
}
