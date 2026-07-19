import { fetchJson } from "../http";

const base_url = "https://api.themoviedb.org/3";
// 优先读 Storage；未配置时回退内置 key（建议用户自行写入 tmdb_token）
const token = Storage.get("tmdb_token") || "f63e065b8fdf9b6401352b9efd1b0ca9";

export class TMDB {
    private static instance: TMDB;
    private headers: Record<string, string>;

    private constructor() {
        this.headers = {
            "Content-Type": "application/json;charset=utf-8",
        };
    }

    public static getInstance(): TMDB {
        if (!TMDB.instance) {
            TMDB.instance = new TMDB();
        }
        return TMDB.instance;
    }

    private async request(method: string, path: string) {
        const url = `${base_url}${path}`;
        return await fetchJson(url, { method, headers: this.headers }, "TMDB");
    }

    async getMovieImages(movieId: number, language = "zh") {
        return this.request("GET", `/movie/${movieId}/images?api_key=${token}&include_image_language=${language},null`);
    }

    async getMovieDetails(movieId: number, language = "zh-CN") {
        return this.request("GET", `/movie/${movieId}?api_key=${token}&language=${language}`);
    }

    getImageUrl(path: string, size: string = "w500"): string | null {
        if (!path) {
            return null;
        }
        return `https://image.tmdb.org/t/p/${size}${path}`;
    }
}
