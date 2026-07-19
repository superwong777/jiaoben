// util/http.ts
// 轻量网络封装：10 秒超时 + 状态码检查 + 统一错误信息。

import { fetch } from "scripting";

export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

type FetchInit = {
    timeoutMs?: number;
    [key: string]: any;
};

export async function fetchJson<T = any>(
    url: string,
    init?: FetchInit,
    label = "请求"
): Promise<T> {
    const response = await fetchWithTimeout(url, init, label);
    if (!response.ok) {
        throw new Error(`${label}失败: HTTP ${response.status}`);
    }
    return (await response.json()) as T;
}

export async function fetchBytes(
    url: string,
    init?: FetchInit,
    label = "下载"
): Promise<Uint8Array> {
    const response = await fetchWithTimeout(url, init, label);
    if (!response.ok) {
        throw new Error(`${label}失败: HTTP ${response.status}`);
    }
    const data = await response.bytes();
    if (!data || data.byteLength === 0) {
        throw new Error(`${label}失败: 空数据`);
    }
    return data;
}

async function fetchWithTimeout(url: string, init: FetchInit | undefined, label: string): Promise<any> {
    const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...requestInit } = init ?? {};
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            fetch(url, requestInit),
            new Promise<any>((_, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(`${label}超时: ${Math.round(timeoutMs / 1000)}秒未响应`));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}
