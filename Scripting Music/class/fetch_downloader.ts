import { fetch, AbortController } from "scripting"
import { database } from "./database"
import { fileManager } from "./file_manager"
import { music } from "./music"
import { ID3Writer } from "../module/browser-id3-writer"
import { detectAudioFormat } from "./audio_format"

type MusicInfo = {
  id: string
  provider: string
  title: string
  artist: string
  album: string
  duration: number
  cover: string
  audio_url?: string
}

type DownloadTask = {
  taskId: string
  musicInfo: MusicInfo
  abortController: AbortController
  isPaused: boolean
}

type ProgressCallback = (progress: number, status: "downloading" | "completed" | "failed" | "cancelled") => void

class FetchDownloader {
  private tasks = new Map<string, DownloadTask>()
  private isBackgroundActive = false
  private progressCallbacks = new Map<string, ProgressCallback>()

  onProgress(musicId: string, cb: ProgressCallback): () => void {
    this.progressCallbacks.set(musicId, cb)
    return () => this.progressCallbacks.delete(musicId)
  }

  async init() {
    console.log(`[FetchDownloader] 初始化完成`)
  }

  async downloadMusic(info: MusicInfo): Promise<void> {
    if (this.tasks.has(info.id)) {
      console.log(`[下载] ${info.title} 已在下载队列中`)
      return
    }
    if (await fileManager.audioExists(info.id)) {
      console.log(`[下载] ${info.title} 已存在`)
      return
    }

    const taskId = await database.createDownloadTask(info.id)
    console.log(`[下载开始] ${info.title}`)

    try {
      if (!info.audio_url) {
        info.audio_url = music.getAudioUrl(info.id, info.provider as any)
      }

      const abortController = new AbortController()
      this.tasks.set(info.id, {
        taskId,
        musicInfo: info,
        abortController,
        isPaused: false
      })

      await this.startBackgroundKeeper()
      await this.performDownload(info.id)
    } catch (error) {
      console.error(`[下载失败] ${info.title}: ${error}`)
      await database.updateDownloadTask(taskId, "failed", 0, String(error))
      this.tasks.delete(info.id)
      await this.stopBackgroundKeeperIfNeeded()
      throw error
    }
  }

  private async performDownload(musicId: string) {
    const task = this.tasks.get(musicId)
    if (!task) return

    const { taskId, musicInfo, abortController } = task

    try {
      await database.updateDownloadTask(taskId, "downloading", 0)
      console.log(`[下载] ${musicInfo.title} - 开始请求`)

      const response = await fetch(musicInfo.audio_url!, {
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLength = parseInt(response.headers.get("content-length") || "0")
      console.log(`[下载] ${musicInfo.title} - 文件大小: ${contentLength} 字节`)

      const chunks: Uint8Array[] = []
      let downloadedBytes = 0

      const reader = response.body!.getReader()
      while (true) {
        if (task.isPaused) {
          console.log(`[下载暂停] ${musicInfo.title}`)
          await database.updateDownloadTask(taskId, "paused", (downloadedBytes / contentLength) * 100)
          return
        }

        const { done, value } = await reader.read()
        if (done) break
        if (!value) continue

        const bytes = value.toUint8Array()
        if (!bytes) continue

        chunks.push(bytes)
        downloadedBytes += bytes.length

        const progress = contentLength > 0 ? (downloadedBytes / contentLength) * 100 : 0
        if (Math.floor(progress) % 10 === 0) {
          console.log(`[下载进度] ${musicInfo.title}: ${Math.floor(progress)}% (${downloadedBytes}/${contentLength})`)
        }
        await database.updateDownloadTask(taskId, "downloading", progress)
        this.progressCallbacks.get(musicId)?.(progress / 100, "downloading")
      }

      console.log(`[下载完成] ${musicInfo.title} - 总大小: ${downloadedBytes} 字节`)
      await this.processDownloadedFile(musicId, chunks)
    } catch (error: any) {
      console.error(error)
      if (error.name === "AbortError") {
        console.log(`[下载取消] ${musicInfo.title}`)
        await database.updateDownloadTask(taskId, "cancelled", 0)
        this.progressCallbacks.get(musicId)?.(0, "cancelled")
      } else {
        console.error(`[下载失败] ${musicInfo.title}: ${error}`)
        await database.updateDownloadTask(taskId, "failed", 0, String(error))
        this.progressCallbacks.get(musicId)?.(0, "failed")
      }
      this.progressCallbacks.delete(musicId)
      this.tasks.delete(musicId)
      await this.stopBackgroundKeeperIfNeeded()
      throw error
    }
  }

  private async processDownloadedFile(musicId: string, chunks: Uint8Array[]) {
    const task = this.tasks.get(musicId)
    if (!task) return

    const { taskId, musicInfo } = task

    try {
      console.log(`[处理文件] ${musicInfo.title} - 合并数据块`)
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const audioData = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        audioData.set(chunk, offset)
        offset += chunk.length
      }

      const format = detectAudioFormat(audioData)
      console.log(`[处理文件] ${musicInfo.title} - 检测格式: ${format}，原始大小: ${audioData.byteLength} 字节，有封面: ${!!musicInfo.cover}`)

      let finalData: Uint8Array

      const fetchCover = async (): Promise<Uint8Array | null> => {
        if (!musicInfo.cover) return null
        try {
          const r = await fetch(musicInfo.cover)
          if (!r.ok) { console.log(`[封面] 获取失败 HTTP ${r.status}`); return null }
          return await r.bytes()
        } catch (e) {
          console.log(`[封面] 获取异常: ${e}`)
          return null
        }
      }

      if (format === "mp3") {
        // 剥离已有 ID3 标签后重新写入（避免 subarray().buffer bug）
        let rawBuffer = audioData.buffer
        if (audioData[0] === 0x49 && audioData[1] === 0x44 && audioData[2] === 0x33) {
          const tagSize = ((audioData[6] & 0x7f) << 21) | ((audioData[7] & 0x7f) << 14) | ((audioData[8] & 0x7f) << 7) | (audioData[9] & 0x7f)
          rawBuffer = audioData.buffer.slice(tagSize + 10)
        }
        const writer = new ID3Writer(rawBuffer)
        writer.setFrame("TIT2", musicInfo.title).setFrame("TALB", musicInfo.album).setFrame("TPE1", [musicInfo.artist])
        const coverData = await fetchCover()
        if (coverData) {
          writer.setFrame("APIC", { type: 3, data: coverData.buffer, description: "cover" })
          await fileManager.saveCover(musicInfo.id, coverData)
        }
        writer.addTag()
        finalData = new Uint8Array(writer.arrayBuffer)
      } else {
        // 非 MP3 格式直接保存原始数据，封面单独保存
        const coverData = await fetchCover()
        if (coverData) await fileManager.saveCover(musicInfo.id, coverData)
        finalData = audioData
      }

      console.log(`[处理文件] ${musicInfo.title} - 原始: ${audioData.byteLength} 字节，最终: ${finalData.byteLength} 字节`)

      const finalPath = fileManager.getAudioPath(musicInfo.id, format === "mp3" ? "mp3" : format === "unknown" ? "mp3" : format)
      await FileManager.writeAsBytes(finalPath, finalData)
      console.log(`[处理文件] ${musicInfo.title} - 已保存到: ${finalPath}`)

      await database.addMusic({
        id: musicInfo.id,
        title: musicInfo.title,
        artist: musicInfo.artist,
        album: musicInfo.album,
        duration: musicInfo.duration,
        cover_url: musicInfo.cover,
        audio_url: musicInfo.audio_url,
        is_downloaded: true,
        file_size: finalData.byteLength,
        added_at: Date.now()
      })

      await database.updateDownloadTask(taskId, "completed", 100)
      console.log(`[下载成功] ${musicInfo.title}`)
      this.progressCallbacks.get(musicId)?.(1, "completed")
      this.progressCallbacks.delete(musicId)
      this.tasks.delete(musicId)
      await this.stopBackgroundKeeperIfNeeded()
    } catch (error) {
      console.error(`[处理失败] ${musicInfo.title}: ${error}`)
      await database.updateDownloadTask(taskId, "failed", 0, String(error))
      this.tasks.delete(musicId)
      await this.stopBackgroundKeeperIfNeeded()
      throw error
    }
  }

  async pauseDownload(musicId: string) {
    const task = this.tasks.get(musicId)
    if (task && !task.isPaused) {
      task.isPaused = true
      console.log(`[暂停下载] ${task.musicInfo.title}`)
    }
  }

  async resumeDownload(musicId: string) {
    const task = this.tasks.get(musicId)
    if (task && task.isPaused) {
      task.isPaused = false
      console.log(`[恢复下载] ${task.musicInfo.title}`)
      await this.performDownload(musicId)
    }
  }

  async cancelDownload(musicId: string) {
    const task = this.tasks.get(musicId)
    if (task) {
      task.abortController.abort()
      console.log(`[取消下载] ${task.musicInfo.title}`)
    }
  }

  private async startBackgroundKeeper() {
    if (!this.isBackgroundActive) {
      const playbackState = MediaPlayer.playbackState
      if (playbackState === MediaPlayerPlaybackState.playing) {
        console.log(`[后台保活] 检测到正在播放音乐，跳过启动以避免中断`)
        return
      }
      const success = await BackgroundKeeper.keepAlive()
      this.isBackgroundActive = success
      console.log(`[后台保活] ${success ? "已启动" : "启动失败"}`)
    }
  }

  private async stopBackgroundKeeperIfNeeded() {
    if (this.isBackgroundActive && this.tasks.size === 0) {
      const playbackState = MediaPlayer.playbackState
      if (playbackState === MediaPlayerPlaybackState.playing) {
        console.log(`[后台保活] 检测到正在播放音乐，延迟停止`)
        this.isBackgroundActive = false
        return
      }
      await BackgroundKeeper.stopKeepAlive()
      this.isBackgroundActive = false
      console.log(`[后台保活] 已停止`)
    }
  }

  async batchDownload(infos: MusicInfo[]) {
    for (const info of infos) {
      await this.downloadMusic(info)
    }
  }

  getDownloadingTasks() {
    return Array.from(this.tasks.values())
  }

  async isDownloaded(musicId: string): Promise<boolean> {
    return await fileManager.audioExists(musicId)
  }

  async deleteDownload(musicId: string): Promise<void> {
    await fileManager.deleteAudio(musicId)
    await fileManager.deleteCover(musicId)
    await database.updateMusicDownloadStatus(musicId, false)
  }

  async getAllDownloaded(): Promise<string[]> {
    const allMusic = await database.getAllMusic()
    return allMusic.filter(m => m.is_downloaded).map(m => m.id)
  }
}

export const fetchDownloader = new FetchDownloader()