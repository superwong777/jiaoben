import { Widget } from "scripting"
import { LifeWidgetView } from "./layouts"
import {
  createAppURL,
  getLifeSnapshot,
  getSettings,
  resolveBackgroundImagePath,
  resolveDisplayTheme,
} from "./shared"

const settings = getSettings()
const backgroundImagePath = resolveBackgroundImagePath(settings)
const theme = resolveDisplayTheme(settings.themeMode, backgroundImagePath.length > 0)
const snapshot = getLifeSnapshot(new Date(), settings)
const family = Widget.family || "systemSmall"

Widget.present(
  <LifeWidgetView
    snapshot={snapshot}
    theme={theme}
    family={family}
    layoutStyle={settings.layoutStyle}
    backgroundImagePath={backgroundImagePath}
    widgetURL={createAppURL()}
  />,
  {
    reloadPolicy: {
      policy: "after",
      date: snapshot.nextReloadAt,
    },
  }
)
