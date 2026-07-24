import { HStack, Spacer, VStack, Text, Image, Link, Widget } from "scripting";
import { IconView } from "../component/icon";
import type { ResolvedTheme, TrendingItem } from "../util/settings";

// MissAV 封面为 16:9 横图（站点 aspect-w-16 aspect-h-9）
const ASPECT = 16 / 9;
const OUTER_SPACING = 8;
const POSTER_SPACING = 6;
const TITLE_ROW_HEIGHT = 18;
// List/widget 的 padding 修饰约 8pt/侧
const PAD = 8;

function PosterImage({
    item,
    width,
    height,
}: {
    item: TrendingItem;
    width: number;
    height: number;
}) {
    const common = {
        aspectRatio: {
            value: ASPECT,
            contentMode: "fill" as const,
        },
        clipShape: {
            type: "rect" as const,
            cornerRadius: 8,
            style: "continuous" as const,
        },
        widgetAccentedRenderingMode: "fullColor" as const,
        resizable: true as const,
        scaledToFill: true as const,
        frame: { width, height },
        clipped: true as const,
    };

    if (item.imageUrl) {
        return <Image {...common} imageUrl={item.imageUrl} />;
    }

    return <Image {...common} filePath={item.imagePath ?? ""} />;
}

/**
 * 横图不能用 maxWidth/maxHeight infinity 等分：
 * 宽高比 > 1 时会优先撑满宽度，把高度顶破标题区剩余空间。
 * 这里按 widget 真实尺寸，在「铺满宽度」和「不超高度」之间取能放下的尺寸。
 */
function calcPosterSize(count: number): { width: number; height: number } {
    const safeCount = Math.max(count, 1);
    const { width: dw, height: dh } = Widget.displaySize || { width: 329, height: 155 };

    const availableWidth = Math.max(dw - PAD * 2, 40);
    const availableHeight = Math.max(dh - PAD * 2 - TITLE_ROW_HEIGHT - OUTER_SPACING, 40);
    const spacingTotal = POSTER_SPACING * Math.max(safeCount - 1, 0);

    // 先按宽度均分
    let width = (availableWidth - spacingTotal) / safeCount;
    let height = width / ASPECT;

    // 超高则改按高度限制，宽度等比收缩（可能左右留白，但不会裁切容器）
    if (height > availableHeight) {
        height = availableHeight;
        width = height * ASPECT;
    }

    width = Math.max(1, Math.round(width * 10) / 10);
    height = Math.max(1, Math.round(height * 10) / 10);
    return { width, height };
}

export function View({
    data,
    theme,
    sourceType,
}: {
    data: TrendingItem[];
    theme: ResolvedTheme;
    sourceType: string;
}) {
    const poster = calcPosterSize(data.length || 1);

    return (
        <VStack
            spacing={OUTER_SPACING}
            padding
            widgetBackground={theme.widgetBackground}
            frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "top" }}
        >
            <HStack alignment="center" frame={{ maxWidth: "infinity", height: TITLE_ROW_HEIGHT }}>
                <Text bold font={12} lineLimit={1} foregroundStyle={theme.labelColor}>
                    今日推荐
                </Text>
                <Spacer />
                <IconView sourceType={sourceType} />
            </HStack>

            <HStack
                spacing={POSTER_SPACING}
                alignment="center"
                layoutPriority={1}
                frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}
            >
                {data.map((item, index) => (
                    <Link
                        key={`${item.openUrl}-${index}`}
                        url={item.openUrl}
                        buttonStyle={"plain"}
                        frame={{ width: poster.width, height: poster.height }}
                    >
                        <PosterImage item={item} width={poster.width} height={poster.height} />
                    </Link>
                ))}
            </HStack>
        </VStack>
    );
}
