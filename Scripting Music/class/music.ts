import { fetch } from "scripting";

export type MusicProvider = "livepoo" | "migu" | "qqmp3" | "qq" | "bugu" | "gequhai" | "gequbao";

export type MusicData = {
  id: string;
  title: string;
  provider: string;
  artist?: string;
  cover?: string;
  album?: string;
  duration?: number;
};

class Music {
  private KEY = "server_setting";
  base: string = Storage.get(this.KEY) || "https://cocodownloader.markqq.com";

  save(value: string) {
    Storage.set(this.KEY, value);
  }

  async search(
    query: string,
    provider: MusicProvider | "all" = "all",
  ): Promise<{ items: MusicData[] }> {
    try {
      const url = `${this.base}/api/search?q=${encodeURIComponent(query)}&provider=${provider}`;
      console.log("搜索URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("搜索结果:", data);
      return data;
    } catch (error) {
      console.error("搜索API错误:", error);
      throw error;
    }
  }

  getAudioUrl(id: string, provider: MusicProvider): string {
    return `${this.base}/api/download?id=${id}&provider=${provider}&filename=co.mp3`;
  }

  async download(id: string, provider: MusicProvider) {
    const response = await fetch(
      `${this.base}/api/download?id=${id}&provider=${provider}&filename=co.mp3`,
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.bytes();
  }
}

export const music = new Music();
