import { HStack, Spacer, VStack, Text, Image, Link, Widget } from "scripting";
import { IconView } from "../component/icon";
import type { ResolvedTheme, TrendingItem } from "../util/settings";

const ASPECT = 2 / 3;
const POSTER_SPACING = 6;
const RIGHT_COL_WIDTH = 24;
const OUTER_SPACING = 8;

type FlexibleFrame = { maxWidth: "infinity"; maxHeight: "infinity" };

function PosterImage({ item, frame }: { item: TrendingItem; frame: FlexibleFrame }) {
    const common = {
        aspectRatio: {
            value: ASPECT,
            contentMode: "fill" as const,
        },
        clipShape: {
            type: "rect" as const,
            cornerRadius: 12,
            style: "continuous" as const,
        },
        widgetAccentedRenderingMode: "fullColor" as const,
        resizable: true as const,
        frame,
    };

    if (item.imageUrl) {
        return <Image {...common} imageUrl={item.imageUrl} />;
    }

    return <Image {...common} filePath={item.imagePath ?? ""} />;
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
    // 弹性等分：让系统在真实 widget 尺寸内均分海报，避免手算宽度把第三张挤出
    const flexible = { maxWidth: "infinity" as const, maxHeight: "infinity" as const };

    return (
        <HStack
            spacing={OUTER_SPACING}
            padding
            widgetBackground={theme.widgetBackground}
            frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        >
            <HStack
                spacing={POSTER_SPACING}
                layoutPriority={1}
                frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}
            >
                {data.map((item, index) => (
                    <Link
                        key={`${item.openUrl}-${index}`}
                        url={item.openUrl}
                        buttonStyle={"plain"}
                        layoutPriority={1}
                        frame={{ ...flexible, alignment: "center" }}
                    >
                        <PosterImage item={item} frame={flexible} />
                    </Link>
                ))}
            </HStack>

            <VStack frame={{ width: RIGHT_COL_WIDTH, maxHeight: "infinity" }}>
                <IconView sourceType={sourceType} />
                <Spacer />
                <VStack spacing={4}>
                    {["今", "日", "推", "荐"].map((ch, i) => (
                        <Text key={`label-${i}`} bold font={14} foregroundStyle={theme.labelColor}>
                            {ch}
                        </Text>
                    ))}
                </VStack>
            </VStack>
        </HStack>
    );
}
