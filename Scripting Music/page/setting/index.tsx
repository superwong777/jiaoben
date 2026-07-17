import {
  Button,
  List,
  NavigationStack,
  Text,
  Section,
  useState,
  useEffect,
  HStack,
  Spacer,
  VStack,
  Toggle,
  NavigationLink,
  Script,
  TextField,
  useObservable,
} from "scripting";
import { setting, StorageLocation } from "../../class/setting";
import { database } from "../../class/database";
import { fileManager } from "../../class/file_manager";
import { sleepTimerManager } from "../../class/sleep_timer";
import { SleepTimerPage } from "./sleep_timer";
import { music } from "../../class/music";

export function SettingView() {
  return (
    <NavigationStack>
      <StackView navigationTitle={"设置"} />
    </NavigationStack>
  );
}

function StackView() {
  const [storageInfo, setStorageInfo] = useState<{ totalSize: number; musicCount: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [useICloud, setUseICloud] = useState(setting.location === "iCloud");
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  async function loadStorageInfo() {
    try {
      const musics = await database.getAllMusic();
      const totalSize = musics.reduce((sum, m) => sum + (m.file_size || 0), 0);
      setStorageInfo({ totalSize, musicCount: musics.length });
    } catch (error) {
      console.error("加载存储信息失败:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStorageLocationChange(value: boolean) {
    const newLocation: StorageLocation = value ? "iCloud" : "appGroup";
    const locationName = value ? "iCloud" : "App 本地";

    const confirmed = await Dialog.confirm({
      title: "切换存储位置",
      message: `确定要将文件移动到${locationName}吗？\n\n此操作会将所有音乐文件移动到新位置，可能需要一些时间。`,
      confirmLabel: "确定",
      cancelLabel: "取消",
    });

    if (!confirmed) return;

    setMigrating(true);
    try {
      await setting.setLocation(newLocation);
      await fileManager.init();
      setUseICloud(value);
      await loadStorageInfo();
      await Dialog.alert({ title: "成功", message: "文件已成功移动到新位置" });
    } catch (error) {
      console.error("切换存储位置失败:", error);
      await Dialog.alert({ title: "失败", message: `切换失败: ${error}` });
    } finally {
      setMigrating(false);
    }
  }

  async function clearCache() {
    try {
      await database.clearSearchHistory();
      await loadStorageInfo();
    } catch (error) {
      console.error("清除缓存失败:", error);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  }

  return (
    <List>
      <Section
        header={<Text>{"存储位置"}</Text>}
        footer={<Text>{"iCloud 可在多设备间同步，本地存储更快速"}</Text>}>
        <Toggle value={useICloud} onChanged={handleStorageLocationChange}>
          <VStack alignment="leading" spacing={2}>
            <Text>{"保存到 iCloud"}</Text>
            <Text font="caption" foregroundStyle="secondaryLabel">
              {migrating ? "正在迁移文件..." : useICloud ? "当前使用 iCloud" : "当前使用本地存储"}
            </Text>
          </VStack>
        </Toggle>
      </Section>

      <Section
        header={<Text>{"服务设置"}</Text>}
        footer={
          <Text
            attributedString={`服务部署步骤：\n1. Fork 项目 [coco-downloader](https://github.com/markcxx/coco-downloader)\n2. 登录 Vercel 并导入该仓库\n3. 点击 Deploy 完成部署\n4. 部署成功后，填写生成的访问 URL`}
          />
        }>
        <ServerSetting />
      </Section>

      <Section header={<Text>{"存储信息"}</Text>}>
        <HStack>
          <Text>{"音乐数量"}</Text>
          <Spacer />
          <Text foregroundStyle="secondaryLabel">
            {loading ? "加载中..." : `${storageInfo?.musicCount || 0} 首`}
          </Text>
        </HStack>
        <HStack>
          <Text>{"占用空间"}</Text>
          <Spacer />
          <Text foregroundStyle="secondaryLabel">
            {loading ? "加载中..." : formatSize(storageInfo?.totalSize || 0)}
          </Text>
        </HStack>
      </Section>

      <Section header={<Text>{"播放"}</Text>}>
        <NavigationLink title="睡眠定时器" destination={<SleepTimerPage />} />
      </Section>

      <Section header={<Text>{"缓存管理"}</Text>}>
        <Button title="清除搜索历史" systemImage="trash" action={clearCache} />
      </Section>

      <Section header={<Text>{"关于"}</Text>}>
        <HStack>
          <Text>{"版本"}</Text>
          <Spacer />
          <Text foregroundStyle="secondaryLabel">{Script.metadata.version}</Text>
        </HStack>
        <VStack alignment="leading" spacing={4}>
          <Text font="headline">{Script.metadata.localizedName}</Text>
          <Text font="subheadline" foregroundStyle="secondaryLabel">
            一个功能完整的音乐播放器
          </Text>
        </VStack>
      </Section>
    </List>
  );
}

function ServerSetting() {
  const url = useObservable<string>(music.base);
  return (
    <TextField
      title={"服务器地址"}
      value={url}
      onSubmit={{
        triggers: "text",
        action: () => {
          music.base = url.value;
          music.save(url.value);
        },
      }}
    />
  );
}
