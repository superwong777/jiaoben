import {
    List,
    Section,
    Picker,
    Text,
    Button,
    Toggle,
    useState,
    Navigation,
    TextField,
    NavigationStack,
} from "scripting";
import {
    SOURCES_ALL,
    getSettings,
    setSettings,
    themeModeLabel,
    type EmbyData,
    type Settings,
    type ThemeMode,
} from "../util/settings";

export function View() {
    const dismiss = Navigation.useDismiss();
    const [settingValue, setSettingValue] = useState<Settings>(getSettings());

    const update = (patch: Partial<Settings>) => {
        setSettingValue({ ...settingValue, ...patch });
    };

    return (
        <NavigationStack>
            <List
                navigationTitle={"设置"}
                toolbar={{
                    topBarTrailing: [
                        <Button
                            title="保存"
                            action={() => {
                                // 成人关闭时，避免停在成人源
                                let next = { ...settingValue };
                                if (
                                    !next.isAdult &&
                                    (next.source === "JavBus" || next.source === "MissAV")
                                ) {
                                    next.source = "豆瓣";
                                }
                                setSettings(next);
                                dismiss();
                            }}
                        />,
                    ],
                }}
            >
                <Section
                    header={<Text>外观</Text>}
                    footer={<Text>强制模式会固定背景与文字颜色，不再跟随系统深浅色。</Text>}
                >
                    <Picker
                        title="主题模式"
                        value={settingValue.themeMode}
                        onChanged={(newValue: string) => {
                            const mode = (["auto", "light", "dark"].includes(newValue)
                                ? newValue
                                : "auto") as ThemeMode;
                            update({ themeMode: mode });
                        }}
                    >
                        {(["auto", "light", "dark"] as ThemeMode[]).map((mode) => (
                            <Text key={mode} tag={mode}>
                                {themeModeLabel(mode)}
                            </Text>
                        ))}
                    </Picker>
                </Section>

                <Section
                    header={<Text>功能</Text>}
                    footer={
                        <Text>
                            轮播开启后，小组件每次刷新会切换到来源列表中的下一个可用源。海报会按「本地日期」每天更换一组，同一天保持稳定。
                        </Text>
                    }
                >
                    <Toggle
                        title="轮播开关"
                        value={settingValue.isCarousel}
                        onChanged={(val: boolean) => update({ isCarousel: val })}
                    />
                    <Toggle
                        title="显示成人内容"
                        value={settingValue.isAdult}
                        onChanged={(val: boolean) => {
                            if (
                                !val &&
                                (settingValue.source === "JavBus" || settingValue.source === "MissAV")
                            ) {
                                update({ isAdult: val, source: "豆瓣" });
                            } else {
                                update({ isAdult: val });
                            }
                        }}
                    />
                </Section>

                <Section title="电影推荐">
                    <Picker
                        title="来源选择"
                        labelsHidden
                        disabled={settingValue.isCarousel}
                        value={settingValue.source}
                        onChanged={(newValue: string) => update({ source: newValue })}
                        pickerStyle="inline"
                    >
                        {SOURCES_ALL.slice(0, 3).map((item) => (
                            <Text key={item} tag={item}>
                                {item}
                            </Text>
                        ))}
                    </Picker>
                </Section>

                {settingValue.isAdult ? (
                    <Section title="成人内容">
                        <Picker
                            title="来源选择"
                            labelsHidden
                            disabled={settingValue.isCarousel}
                            value={settingValue.source}
                            onChanged={(newValue: string) => update({ source: newValue })}
                            pickerStyle="inline"
                        >
                            {SOURCES_ALL.slice(3, 5).map((item) => (
                                <Text key={item} tag={item}>
                                    {item}
                                </Text>
                            ))}
                        </Picker>
                    </Section>
                ) : null}

                {settingValue.source === "Emby" ? (
                    <Section
                        header={<Text>配置项目</Text>}
                        footer={<Text>地址与 API Key 会实时写入当前设置，点右上角「保存」后生效。</Text>}
                    >
                        <EmbyConfig
                            init={settingValue.emby}
                            onConfirm={(val) => update({ emby: val })}
                        />
                    </Section>
                ) : null}
            </List>
        </NavigationStack>
    );
}

function EmbyConfig({ init, onConfirm }: { init: EmbyData; onConfirm: (data: EmbyData) => void }) {
    const [addr, setAddr] = useState(init.addr);
    const [key, setKey] = useState(init.key);

    const push = (nextAddr: string, nextKey: string) => {
        onConfirm({
            addr: nextAddr.trim(),
            key: nextKey.trim(),
        });
    };

    return (
        <>
            <TextField
                title="Emby 服务器地址"
                value={addr}
                onChanged={(val: string) => {
                    setAddr(val);
                    push(val, key);
                }}
                onSubmit={{
                    triggers: "text",
                    action: () => push(addr, key),
                }}
            />
            <TextField
                title="Emby API Key"
                value={key}
                onChanged={(val: string) => {
                    setKey(val);
                    push(addr, val);
                }}
                onSubmit={{
                    triggers: "text",
                    action: () => push(addr, key),
                }}
            />
        </>
    );
}
