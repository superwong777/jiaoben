import { fetch } from "scripting"
import type { TelegramAudience } from "./types"

// ==========================================
// 头像本地缓存
// ------------------------------------------
// Widget 无法稳定访问远程 CDN（冷启动 / 离线 / URL 过期），
// 所以手动刷新时把头像下载到 App Group 目录；Widget 只读本地文件。
// ==========================================

const AVATAR_DIR_NAME = "tg-audience-avatars"
const AVATAR_FILE_STEM = "avatar"

function avatarDirectory(): string {
  return FileManager.appGroupDocumentsDirectory + "/" + AVATAR_DIR_NAME
}

function ensureAvatarDirectory(): void {
  const dir = avatarDirectory()
  if (!FileManager.existsSync(dir)) {
    FileManager.createDirectorySync(dir, true)
  }
}

function guessExtension(contentType: string | null | undefined, url: string): string {
  const type = (contentType ?? "").toLowerCase()
  if (type.includes("png")) return "png"
  if (type.includes("webp")) return "webp"
  if (type.includes("gif")) return "gif"
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg"

  const match = url.match(/\.([a-zA-Z0-9]{3,4})(?:\?|$)/)
  const ext = match?.[1]?.toLowerCase()
  if (ext === "png" || ext === "webp" || ext === "gif" || ext === "jpg" || ext === "jpeg") {
    return ext === "jpeg" ? "jpg" : ext
  }
  return "jpg"
}

/** 本地头像文件是否仍可用（Widget 渲染前也会用到） */
export function isLocalAvatarValid(path: string | undefined): path is string {
  return !!path && FileManager.existsSync(path) && FileManager.isFileSync(path)
}

/** 清除所有本地头像文件 */
export function clearAvatarCache(): void {
  const dir = avatarDirectory()
  if (FileManager.existsSync(dir)) {
    FileManager.removeSync(dir)
  }
}

/**
 * 下载远程头像到 App Group 本地。
 * - 远程 URL 未变化且本地文件仍在：直接复用
 * - 下载失败：回退旧本地头像
 * - 无远程头像：尽量保留旧本地文件
 */
export async function attachCachedAvatar(
  data: TelegramAudience,
  previous: TelegramAudience | null = null
): Promise<TelegramAudience> {
  const remoteUrl = data.avatarURL?.trim() || undefined

  if (
    remoteUrl &&
    previous?.avatarURL === remoteUrl &&
    isLocalAvatarValid(previous.avatarPath)
  ) {
    return {
      ...data,
      avatarURL: remoteUrl,
      avatarPath: previous.avatarPath,
    }
  }

  if (!remoteUrl) {
    if (isLocalAvatarValid(previous?.avatarPath)) {
      return {
        ...data,
        avatarURL: previous?.avatarURL,
        avatarPath: previous!.avatarPath,
      }
    }
    return { ...data, avatarURL: undefined, avatarPath: undefined }
  }

  try {
    const response = await fetch(remoteUrl, {
      timeout: 10,
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      },
    })
    if (!response.ok) {
      throw new Error(`头像下载失败（HTTP ${response.status}）`)
    }

    const bytes = await response.data()
    if (!bytes || bytes.size === 0) {
      throw new Error("头像内容为空")
    }

    const contentType =
      typeof response.headers?.get === "function"
        ? response.headers.get("content-type")
        : undefined
    const ext = guessExtension(contentType, remoteUrl)
    ensureAvatarDirectory()

    const path = `${avatarDirectory()}/${AVATAR_FILE_STEM}.${ext}`
    // 清理旧扩展名文件，避免长期堆积
    if (isLocalAvatarValid(previous?.avatarPath) && previous!.avatarPath !== path) {
      try {
        FileManager.removeSync(previous!.avatarPath!)
      } catch {
        // 忽略清理失败
      }
    }

    await FileManager.writeAsData(path, bytes)
    return {
      ...data,
      avatarURL: remoteUrl,
      avatarPath: path,
    }
  } catch {
    if (isLocalAvatarValid(previous?.avatarPath)) {
      return {
        ...data,
        avatarURL: previous?.avatarURL ?? remoteUrl,
        avatarPath: previous!.avatarPath,
      }
    }
    return {
      ...data,
      avatarURL: remoteUrl,
      avatarPath: undefined,
    }
  }
}
