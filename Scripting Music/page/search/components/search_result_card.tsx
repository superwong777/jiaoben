import { HStack, VStack, Text, Image, Spacer, Button, Group, Label, ZStack, Circle, ProgressView } from "scripting"
import { MusicData, music } from "../../../class/music"
import { player } from "../../../class/player"
import { downloadManager } from "../../../class/download_manager"
import { Music, database } from "../../../class/database"
import { useState, useEffect } from "scripting"

type Props = {
  info: MusicData
  isPlaying: boolean
  onShowPlaylistPicker?: () => void
}

export function SearchResultCard({ info, isPlaying, onShowPlaylistPicker }: Props) {
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadError, setDownloadError] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [coverError, setCoverError] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [info.id])

  async function checkStatus() {
    const downloaded = await downloadManager.isDownloaded(info.id)
    setIsDownloaded(downloaded)
    const musicData = await database.getMusic(info.id)
    setIsFavorite(musicData?.is_favorite || false)
  }

  async function handlePlay() {
      const audioUrl = music.getAudioUrl(info.id, info.provider as any)
      const musicData: Music = {
        id: info.id,
        title: info.title,
        artist: info.artist || "未知艺术家",
        album: info.album || "未知专辑",
        duration: info.duration || 0,
        cover_url: info.cover || "",
        audio_url: audioUrl,
        is_downloaded: false,
        added_at: Date.now(),
        play_count: 0,
        is_favorite: false
      }
      await player.playNext(musicData)
    }

  async function handleDownload() {
    if (isDownloaded || isDownloading) return
    setIsDownloading(true)
    setDownloadProgress(0)
    setDownloadError(false)

    // Poll DB for progress every 300ms until terminal state
        let stopPolling = false
        const poll = async () => {
          if (stopPolling) return
          const task = await database.getDownloadTaskByMusicId(info.id)
          // Wait for a fresh "pending" or "downloading" task
          if (!task || task.status === "failed" || task.status === "cancelled") {
            setTimeout(poll, 300)
            return
          }
          if (task.progress > 0) setDownloadProgress(task.progress / 100)
          if (task.status === "completed") {
            stopPolling = true
            setIsDownloaded(true)
            setIsDownloading(false)
          } else {
            setTimeout(poll, 300)
          }
        }
        setTimeout(poll, 300)

    try {
          await downloadManager.downloadMusic({
            id: info.id,
            provider: info.provider,
            title: info.title,
            artist: info.artist || "未知艺术家",
            album: info.album || "未知专辑",
            duration: info.duration || 0,
            cover: info.cover || ""
          })
        } catch {
          stopPolling = true
          setIsDownloading(false)
          setDownloadError(true)
          setTimeout(() => setDownloadError(false), 3000)
        }
  }

  async function handleCancelDownload() {
    await downloadManager.cancelDownload(info.id)
  }

  async function toggleFavorite() {
    try {
      await database.toggleFavorite(info.id)
      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error("收藏失败:", error)
    }
  }

  return (
    <HStack
      spacing={12}
      contextMenu={{
        menuItems: (
          <Group>
            <Button title={isFavorite ? "取消收藏" : "收藏"} action={toggleFavorite} />
            {onShowPlaylistPicker ? (
              <Button title="添加到播放列表" action={onShowPlaylistPicker} />
            ) : null}
            {!isDownloaded ? (
              <Button
                title={isDownloading ? "取消下载" : "下载"}
                action={isDownloading ? handleCancelDownload : handleDownload}
              />
            ) : null}
          </Group>
        )
      }}
      leadingSwipeActions={{
        actions: [
          <Button tint="systemPink" action={toggleFavorite}><Label title={isFavorite ? "取消" : "收藏"} systemImage="heart.fill" />
          </Button>
        ]
      }}
      trailingSwipeActions={!isDownloaded ? {
        actions: [
          <Button tint="systemBlue" action={handleDownload}>
            <Label title="下载" systemImage="arrow.down.circle.fill" />
          </Button>
        ]
      } : undefined}
    >
      <HStack spacing={12} onTapGesture={handlePlay}>
        {info.cover && !coverError ? (
          <Image
            imageUrl={info.cover}
            resizable={true}
            scaleToFill={true}
            frame={{ height: 50, width: 50 }}
            clipShape={{ type: "rect", cornerRadius: 8 }}
            onError={() => setCoverError(true)}
            placeholder={
              <Image
                systemName="music.note"
                frame={{ height: 50, width: 50 }}
                foregroundStyle="secondaryLabel"
                background="secondarySystemFill"
                clipShape={{ type: "rect", cornerRadius: 8 }}
              />
            }
          />
        ) : (
          <Image
            systemName="music.note"
            frame={{ height: 50, width: 50 }}
            foregroundStyle="secondaryLabel"
            background="secondarySystemFill"
            clipShape={{ type: "rect", cornerRadius: 8 }}
          />
        )}
        <VStack alignment="leading" spacing={2}>
          <Text font="headline" lineLimit={1} foregroundStyle={isPlaying ? "accentColor" : undefined}>
            {info.title}
          </Text>
          <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>
            {[info.artist || "未知艺术家", info.album].filter(Boolean).join(" · ")}
          </Text>
        </VStack>
      </HStack>
      <Spacer />
      {isPlaying ? (
        <Image systemName="waveform" tint="accentColor" />
      ) : null}
      {isDownloading ? (
              <Button action={handleCancelDownload} frame={{ width: 44, height: 44 }}>
                <VStack spacing={2}>
                  <ZStack>
                    {downloadProgress > 0 ? (
                      <>
                        <Circle
                          stroke={{ shapeStyle: "accentColor", strokeStyle: { lineWidth: 2 } }}
                          frame={{ width: 24, height: 24 }}
                          opacity={0.3}
                        />
                        <Circle
                          trim={{ from: 0, to: downloadProgress }}
                          stroke={{ shapeStyle: "accentColor", strokeStyle: { lineWidth: 2 } }}
                          frame={{ width: 24, height: 24 }}
                        />
                      </>
                    ) : (
                                          <ProgressView progressViewStyle="circular" frame={{ width: 24, height: 24 }} />
                                        )}
                      </ZStack>
                  <Text font="caption2" foregroundStyle="accentColor">取消</Text>
                </VStack>
              </Button>
            ) : (
              <Button action={handleDownload} frame={{ width: 44, height: 44 }}>
                <Image
                  font="title2"
                  systemName={downloadError ? "exclamationmark.circle.fill" : isDownloaded ? "checkmark.circle.fill" : "arrow.down.circle.fill"}
                  tint={downloadError ? "systemRed" : isDownloaded ? "systemGreen" : "accentColor"}
                  symbolRenderingMode="hierarchical"
                />
              </Button>
            )}
    </HStack>
  )
}