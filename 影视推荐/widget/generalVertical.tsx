import { HStack, Spacer, VStack, Text, Image, Link } from "scripting";
import { IconView } from "../component/icon";
import type { ResolvedTheme, TrendingItem } from "../util/settings";

export function View({
    data,
    theme,
    sourceType,
}: {
    data: TrendingItem[];
    theme: ResolvedTheme;
    sourceType: string;
}) {
    return (
        <HStack
            padding
            widgetBackground={theme.widgetBackground}
            frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        >
            {data.map((item, index) => (
                <Link key={`${item.openUrl}-${index}`} url={item.openUrl} buttonStyle={"plain"}>
                    {item.imageUrl ? (
                        <Image
                            aspectRatio={{
                                value: 2 / 3,
                                contentMode: "fit",
                            }}
                            clipShape={{
                                type: "rect",
                                cornerRadius: 12,
                                style: "continuous",
                            }}
                            widgetAccentedRenderingMode="fullColor"
                            resizable
                            imageUrl={item.imageUrl}
                        />
                    ) : (
                        <Image
                            aspectRatio={{
                                value: 2 / 3,
                                contentMode: "fit",
                            }}
                            clipShape={{
                                type: "rect",
                                cornerRadius: 12,
                                style: "continuous",
                            }}
                            widgetAccentedRenderingMode="fullColor"
                            resizable
                            filePath={item.imagePath ?? ""}
                        />
                    )}
                </Link>
            ))}
            <Spacer />
            <VStack>
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
