import { Button, HStack, Image, Spacer, useState } from "scripting"
import { usePlayerState } from "../../class/player_state"
import { player } from "../../class/player"
import { PlayMode } from "../../class/player"
import { QueueSheet } from "./queue"
import { Navigation } from "scripting"

const PLAY_MODE_ICONS: Record<PlayMode, string> = {
  "sequential": "arrow.right",
  "repeat-all": "repeat",
  "repeat-one": "repeat.1",
  "shuffle": "shuffle",
}

const PLAY_MODE_ORDER: PlayMode[] = ["sequential", "repeat-all", "repeat-one", "shuffle"]

export function Control() {
  const { isPlaying, playMode, queue, currentIndex } = usePlayerState()
  const [showQueue, setShowQueue] = useState(false)
  const loops = playMode === "repeat-all" || playMode === "shuffle"
  const hasPrev = loops || currentIndex > 0
  const hasNext = loops || currentIndex < queue.length - 1

  function cyclePlayMode() {
    const idx = PLAY_MODE_ORDER.indexOf(playMode)
    player.setPlayMode(PLAY_MODE_ORDER[(idx + 1) % PLAY_MODE_ORDER.length])
  }

  return (
    <HStack font={53} tint={"systemPink"} sheet={{isPresented: showQueue,
      onChanged: setShowQueue,
      content: <QueueSheet />
    }}>
      <Button action={cyclePlayMode} font={20} tint={playMode === "sequential" ? "secondaryLabel" : "systemPink"}>
        <Image systemName={PLAY_MODE_ICONS[playMode]} />
      </Button>
      <Spacer />
      <Button action={() => player.previous()} disabled={!hasPrev}>
        <Image systemName="backward.circle.fill" fontWeight={"thin"} symbolRenderingMode={"hierarchical"} />
      </Button>
      <Spacer />
      <Button action={() => { isPlaying ? player.pause() : player.play() }}>
        <Image systemName={isPlaying ? "pause.circle.fill" : "play.circle.fill"} fontWeight={"thin"} symbolRenderingMode={"hierarchical"} />
      </Button>
      <Spacer />
      <Button action={() => player.next()} disabled={!hasNext}>
        <Image systemName="forward.circle.fill" fontWeight={"thin"} symbolRenderingMode={"hierarchical"} />
      </Button>
      <Spacer />
      <Button action={() => setShowQueue(true)} font={20} tint="systemPink">
        <Image systemName="list.bullet" />
      </Button>
    </HStack>
  )
}