// util/localImage.ts
// 本地海报目录清理：只保留仍被引用的文件，避免 iCloud 目录膨胀。

import { Path } from "scripting";

/** 删除 dir 下不在 keepPaths 中的文件（不递归子目录）。返回删除数量。 */
export async function pruneImageDir(rootPath: string, keepPaths: Iterable<string>): Promise<number> {
    try {
        if (!(await FileManager.exists(rootPath))) {
            return 0;
        }

        const keep = new Set<string>();
        for (const p of keepPaths) {
            if (!p) continue;
            keep.add(p);
            keep.add(baseName(p));
        }

        const entries = await FileManager.readDirectory(rootPath);
        let removed = 0;

        for (const entry of entries) {
            const full = isAbsolutePath(entry) ? entry : Path.join(rootPath, entry);
            const name = baseName(full);

            if (keep.has(full) || keep.has(name)) {
                continue;
            }

            try {
                if (await FileManager.isDirectory(full)) {
                    continue;
                }
                await FileManager.remove(full);
                removed += 1;
            } catch (err) {
                console.warn(`清理图片失败: ${full}`, err);
            }
        }

        if (removed > 0) {
            console.log(`[image prune] ${rootPath} 删除 ${removed} 个旧文件`);
        }
        return removed;
    } catch (err) {
        console.warn(`[image prune] 清理失败: ${rootPath}`, err);
        return 0;
    }
}

function baseName(path: string): string {
    const parts = path.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] || path;
}

function isAbsolutePath(path: string): boolean {
    return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}
