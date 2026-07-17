import { Navigation, Script, Widget } from "scripting";
import { View } from "./pages";

(async () => {
    await Navigation.present(<View />);
    Widget.reloadAll();
})()
    .catch((e) => {
        console.log(e);
    })
    .finally(() => {
        Script.exit();
    });
