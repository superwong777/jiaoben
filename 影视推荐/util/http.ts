// util/http.ts
// 轻量网络封装：状态码检查 + 统一错误信息。

import { fetch } from "scripting";

export async function fetchJson<T = any>(
    url: string,
    init?: RequestInit,
    label = "请求"
): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`${label}失败: HTTP ${response.status}`);
    }
    return (await response.json()) as T;
}

export async function fetchBytes(
    url: string,
    init?: RequestInit,
    label = "下载"
): Promise<ArrayBuffer> {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`${label}失败: HTTP ${response.status}`);
    }
    const data = await response.bytes();
    if (!data || data.byteLength === 0) {
        throw new Error(`${label}失败: 空数据`);
    }
    return data;
}
