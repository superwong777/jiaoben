import { Image, Script, Path, Link } from "scripting";
import { getSettings } from "../util/settings";

const ICON_MAP: Record<string, { path: string; url: string | (() => string) }> = {
    豆瓣: {
        path: "douban.png",
        url: "https://movie.douban.com/cinema/nowplaying",
    },
    Trakt: {
        path: "trakt.png",
        url: "https://trakt.tv/movies/trending",
    },
    Emby: {
        path: "emby.png",
        url: () => getSettings().emby.addr || "https://emby.media",
    },
    JavBus: {
        path: "javbus.jpg",
        url: "https://www.javbus.com",
    },
    MissAV: {
        path: "missav.png",
        url: "https://missav.ai",
    },
};

export function IconView({ sourceType }: { sourceType: string }) {
    const iconSize = 24;
    const conf = ICON_MAP[sourceType] ?? {
        path: "douban.png",
        url: "https://movie.douban.com",
    };
    const url = typeof conf.url === "function" ? conf.url() : conf.url;

    return (
        <Link url={url} buttonStyle={"plain"}>
            <Image
                filePath={Path.join(Script.directory, `image/${conf.path}`)}
                frame={{ width: iconSize, height: iconSize }}
                resizable
                clipShape={{
                    type: "rect",
                    cornerRadius: 4,
                }}
            />
        </Link>
    );
}
