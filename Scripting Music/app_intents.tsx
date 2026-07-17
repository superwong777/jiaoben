import { AppIntentManager, AppIntentProtocol, Navigation, Script, Widget } from "scripting"
import { player } from "./class/player"
import { downloadManager } from "./class/download_manager"
import { HomePage } from "./page"

let cancel: Function | null

cancel = Script.onResume(async () => {
  // 只注册一次
  setTimeout(() => {
    cancel?.()
    cancel = null
  }, 1000)

  try {
    await player.init()
    await downloadManager.init()
    await Navigation.present({
      element: <HomePage />,
      modalPresentationStyle: "overFullScreen"
    })
    if (player.getState() === "playing") {
      await player.pause()
    }
    Script.exit()
  } catch (e) {
    console.present().then(Script.exit)
    console.error(e)
  }
})

export const TogglePlaybackIntent = AppIntentManager.register({
  name: "TogglePlaybackIntent",
  protocol: AppIntentProtocol.AudioPlaybackIntent,
  perform: async (_params: undefined) => {

    await player.init()
    if (player.getState() === "playing") {
      await player.pause()
    } else {
      await player.play()
    }
    Widget.reloadUserWidgets()
  }
})

export const PreviousTrackIntent = AppIntentManager.register({
  name: "PreviousTrackIntent",
  protocol: AppIntentProtocol.AudioPlaybackIntent,
  perform: async (_params: undefined) => {
    await player.init()
    await player.previous()
    Widget.reloadUserWidgets()
  }
})

export const NextTrackIntent = AppIntentManager.register({
  name: "NextTrackIntent",
  protocol: AppIntentProtocol.AudioPlaybackIntent,
  perform: async (_params: undefined) => {
    await player.init()
    await player.next()
    Widget.reloadUserWidgets()
  }
})