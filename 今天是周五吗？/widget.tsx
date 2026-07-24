import { Widget } from "scripting"
import { FridayWidgetView } from "./layouts"
import {
  createShowcaseURL,
  getFridaySnapshot,
  getSettings,
  resolveTheme,
} from "./shared"

const settings = getSettings()
const theme = resolveTheme(settings.themeMode)
const snapshot = getFridaySnapshot(new Date(), settings)
const family = Widget.family || "systemSmall"

Widget.present(
  <FridayWidgetView
    snapshot={snapshot}
    theme={theme}
    layoutStyle={settings.layoutStyle}
    family={family}
    showParticles={settings.showParticles}
    widgetURL={createShowcaseURL()}
  />,
  {
    reloadPolicy: {
      policy: "after",
      date: snapshot.nextReloadAt,
    },
  }
)
