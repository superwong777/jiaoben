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
    const ratio = 1.414;

    return (
        <VStack
            padding
            widgetBackground={theme.widgetBackground}
            frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        >
            <HStack>
                <Text bold font={12} frame={{ width: 24 }} foregroundStyle={theme.labelColor}>
                    今日推荐
                </Text>
                <Spacer />
                <IconView sourceType={sourceType} />
            </HStack>

            <Spacer />

            <HStack>
                {data.map((item, index) => (
                    <Link key={`${item.openUrl}-${index}`} url={item.openUrl} buttonStyle={"plain"}>
                        {item.imageUrl ? (
                            <Image
                                aspectRatio={{
                                    value: ratio,
                                    contentMode: "fit",
                                }}
                                clipShape={{
                                    type: "rect",
                                    cornerRadius: 8,
                                    style: "continuous",
                                }}
                                widgetAccentedRenderingMode="fullColor"
                                resizable
                                imageUrl={item.imageUrl}
                            />
                        ) : (
                            <Image
                                aspectRatio={{
                                    value: ratio,
                                    contentMode: "fit",
                                }}
                                clipShape={{
                                    type: "rect",
                                    cornerRadius: 8,
                                    style: "continuous",
                                }}
                                widgetAccentedRenderingMode="fullColor"
                                resizable
                                filePath={item.imagePath ?? ""}
                            />
                        )}
                    </Link>
                ))}
            </HStack>
        </VStack>
    );
}
