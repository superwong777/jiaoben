import {
  useEffect,
  useMemo,
  useState,
  List,
  Section,
  Text,
  VStack,
  HStack,
  Image,
  Button,
  Spacer,
  Menu,
  Toolbar,
  ToolbarItem,
  Picker,
  Group,
  Label,
} from "scripting"
import { MusicData, music } from "../../class/music"
import { Music, database } from "../../class/database"
import { player } from "../../class/player"
import { fileManager } from "../../class/file_manager"
import { SearchResultCard } from "./components/search_result_card"
import { addToHistory, getHistory, clearHistory } from "./components/search_history"
import { usePlayerState } from "../../class/player_state"
import { PlaylistPickerContent } from "../components/playlist_picker"

type CacheEntry = { data: MusicData[], timestamp: number }
type SortType = "relevance" | "title" | "artist"
type SearchMode = "online" | "local"

const searchCache = new Map<string, CacheEntry>()
const CACHE_DURATION = 5 * 60 * 1000

export function SearchView() {
  const [inputValue, setInputValue] = useState("")
  const [query, setQuery] = useState("")
  const [mode, setMode] = useState<SearchMode>("online")
  const [results, setResults] = useState<MusicData[] | null>(null)
  const [localResults, setLocalResults] = useState<Music[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortType, setSortType] = useState<SortType>("relevance")
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false)
  const [selectedMusic, setSelectedMusic] = useState<MusicData | Music | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const playerState = usePlayerState()

  const history = useMemo(() => getHistory(), [historyVersion])

  useEffect(() => {
    const trimmed = inputValue.trim()
    if (trimmed && history.includes(trimmed) && trimmed !== query) {
      doSearch(trimmed)
    }
  }, [inputValue])

  // Re-run search when mode changes (if there's an active query)
  useEffect(() => {
    if (query) doSearch(query)
  }, [mode])

  function sortResults(data: MusicData[], type: SortType): MusicData[] {
      const sorted = [...data]
      switch (type) {
        case "title": sorted.sort((a, b) => a.title.localeCompare(b.title)); break
        case "artist": sorted.sort((a, b) => (a.artist || "").localeCompare(b.artist || "")); break
        default: break
      }
      // Prioritize items with cover art
      return sorted.sort((a, b) => (b.cover ? 1 : 0) - (a.cover ? 1 : 0))
    }

  async function doSearch(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setQuery(trimmed)
    addToHistory(trimmed)
    setHistoryVersion(v => v + 1)

    if (mode === "local") {
      await doLocalSearch(trimmed)
    } else {
      await doOnlineSearch(trimmed)
    }
  }

  async function doLocalSearch(q: string) {
    setIsSearching(true)
    setLocalResults(null)
    setError(null)
    try {
      const all = await database.getAllMusic()
      const lower = q.toLowerCase()
      const filtered = all.filter(m =>
        m.title.toLowerCase().includes(lower) ||
        m.artist.toLowerCase().includes(lower) ||
        m.album.toLowerCase().includes(lower)
      )
      setLocalResults(filtered)
    } catch {
      setError("搜索失败")
      setLocalResults([])
    } finally {
      setIsSearching(false)
    }
  }

  async function doOnlineSearch(q: string) {
    const cached = searchCache.get(q)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setResults(sortResults(cached.data, sortType))
      setError(null)
      return
    }
    setIsSearching(true)
    setResults(null)
    setError(null)
    try {
      const { items } = await music.search(q)
      setResults(sortResults(items, sortType))
            searchCache.set(q, { data: items, timestamp: Date.now() })
    } catch {
      setError("搜索失败，请检查网络连接后重试")
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (results && results.length > 0) {
      setResults(prev => sortResults(prev!, sortType))
    }
  }, [sortType])

  async function addToPlaylist(playlistId: string) {
    if (!selectedMusic) return
    try {
      await database.addMusicToPlaylist(playlistId, selectedMusic.id)
            setShowPlaylistPicker(false)
            setSelectedMusic(null)
    } catch (e) {
      console.error(e)
    }
  }

  async function deleteLocalMusic(m: Music) {
    try {
      await database.deleteMusic(m.id)
      setLocalResults(prev => prev ? prev.filter(x => x.id !== m.id) : prev)
    } catch (e) {
      console.error(e)
    }
  }

  async function playLocal(m: Music, list: Music[]) {
    const idx = list.indexOf(m)
    player.setQueue(list, idx)
    await player.play(m)
  }

  const dismissPlaylistPicker = () => { setShowPlaylistPicker(false); setSelectedMusic(null) }

  const hasOnlineResults = results !== null && results.length > 0
  const hasLocalResults = localResults !== null && localResults.length > 0
  const showEmpty = mode === "online"
    ? (results !== null && results.length === 0)
    : (localResults !== null && localResults.length === 0)

  return (
    <List
      sheet={{
        isPresented: showPlaylistPicker,
        onChanged: (v: boolean) => { if (!v) dismissPlaylistPicker() },
        content: <PlaylistPickerContent onSelect={addToPlaylist} onDismiss={dismissPlaylistPicker} />
      }}
      searchable={{
        value: inputValue,
        onChanged: setInputValue,
        placement: "navigationBarDrawer",
        prompt: mode === "local" ? "搜索本地歌曲" : "搜索音乐、艺人、专辑"
      }}
      searchSuggestions={
        <>
          {!inputValue.trim() && history.map((h, i) => (
            <Text key={i} searchCompletion={h}>{`🕐 ${h}`}</Text>
          ))}
        </>
      }
      onSubmit={{
        triggers: "search",
        action: () => doSearch(inputValue)
      }}
      submitLabel="search"
      toolbar={
              <Toolbar>
                {hasOnlineResults && !isSearching && mode === "online" && (
                  <ToolbarItem placement="topBarTrailing">
                    <Menu label={<Image systemName="arrow.up.arrow.down" />}>
                      <Button title="按相关度" systemImage={sortType === "relevance" ? "checkmark" : undefined} action={() => setSortType("relevance")} />
                      <Button title="按歌曲名称" systemImage={sortType === "title" ? "checkmark" : undefined} action={() => setSortType("title")} />
                      <Button title="按艺人名称" systemImage={sortType === "artist" ? "checkmark" : undefined} action={() => setSortType("artist")} />
                    </Menu>
                  </ToolbarItem>
                )}
              </Toolbar>
            }>
      <Section>
        <Picker
                  label={<Text>搜索模式</Text>}
                  value={mode}
                  onChanged={(v: string) => setMode(v as SearchMode)}
                  pickerStyle="segmented"
                >
          <Text tag="online">在线</Text>
          <Text tag="local">本地</Text>
        </Picker>
      </Section>

      {isSearching ? (
        <Section>
          <VStack spacing={12} padding={{ top: 40, bottom: 40 }} frame={{ maxWidth: "infinity" }}>
            <Image systemName="magnifyingglass" font="largeTitle" foregroundStyle="tertiaryLabel" />
            <Text font="headline" foregroundStyle="secondaryLabel">正在搜索...</Text></VStack>
        </Section>
      ) : error ? (
        <Section>
          <VStack spacing={8} padding={{ top: 40, bottom: 40 }} frame={{ maxWidth: "infinity" }}>
            <Image systemName="wifi.slash" font="largeTitle" foregroundStyle="tertiaryLabel" />
            <Text font="headline" foregroundStyle="secondaryLabel">搜索失败</Text>
            <Text font="subheadline" foregroundStyle="tertiaryLabel">{error}</Text>
          </VStack>
        </Section>
      ) : showEmpty ? (
        <Section>
          <VStack spacing={8} padding={{ top: 40, bottom: 40 }} frame={{ maxWidth: "infinity" }}>
            <Image systemName="music.note.list" font="largeTitle" foregroundStyle="tertiaryLabel" />
            <Text font="headline" foregroundStyle="secondaryLabel">未找到相关音乐</Text><Text font="subheadline" foregroundStyle="tertiaryLabel">试试其他关键词</Text>
          </VStack>
        </Section>
      ) : mode === "online" && hasOnlineResults ? (
              <Section header={<Text>{`"${query}" 的搜索结果`}</Text>}>
                {results!.map(item => (
                  <SearchResultCard
                    key={item.id}
                    info={item}
                    isPlaying={playerState.currentMusic?.id === item.id}
                    onShowPlaylistPicker={() => { setSelectedMusic(item); setShowPlaylistPicker(true) }}
      />
                ))}
              </Section>
      ) : mode === "local" && hasLocalResults ? (
        <Section header={<Text>{`"${query}" 的本地结果`}</Text>}>
          {localResults!.map(m => (
            <LocalMusicRow
              key={m.id}
              music={m}
              isPlaying={playerState.currentMusic?.id === m.id}
              onPlay={() => playLocal(m, localResults!)}
              onAddToPlaylist={() => { setSelectedMusic(m); setShowPlaylistPicker(true) }}
              onDelete={() => deleteLocalMusic(m)}
            />
          ))}
        </Section>
      ) : (
        history.length > 0 ? (
          <Section
            header={
              <HStack>
                <Text>最近搜索</Text>
                <Spacer />
                <Button title="清除" action={() => { clearHistory(); setHistoryVersion(v => v + 1) }} />
              </HStack>
            }
          >
            {history.map((h, i) => (
              <Button key={i} action={() => doSearch(h)}>
                <HStack>
                  <Text>{h}</Text>
                  <Spacer />
                  <Image systemName="arrow.up.left" foregroundStyle="tertiaryLabel" />
                </HStack>
              </Button>
            ))}
          </Section>
        ) : null
      )}
    </List>
  )
}

type LocalMusicRowProps = {
  music: Music
  isPlaying: boolean
  onPlay: () => void
  onAddToPlaylist: () => void
  onDelete: () => void
}

function LocalMusicRow({ music, isPlaying, onPlay, onAddToPlaylist, onDelete }: LocalMusicRowProps) {
  const [coverExists, setCoverExists] = useState(false)

  useEffect(() => {
    fileManager.coverExists(music.id).then(setCoverExists)
  }, [music.id])

  return (
    <HStack
      spacing={12}
      onTapGesture={onPlay}
      contextMenu={{
        menuItems: (
          <Group>
            <Button title="添加到播放列表" action={onAddToPlaylist} />
            <Button title="删除" role="destructive" action={onDelete} />
          </Group>
        )
      }}
      leadingSwipeActions={{
        actions: [
          <Button tint="systemBlue" action={onAddToPlaylist}>
            <Label title="歌单" systemImage="music.note.list" />
          </Button>
        ]
      }}
      trailingSwipeActions={{
        actions: [
          <Button role="destructive" action={onDelete}>
            <Label title="删除" systemImage="trash" />
          </Button>
        ]
      }}
    >
      {coverExists
        ? <Image filePath={fileManager.getCoverPath(music.id)} frame={{ width: 50, height: 50 }} resizable={true} clipShape={{ type: "rect", cornerRadius: 8 }} />
        : <Image systemName="music.note" frame={{ width: 50, height: 50 }} foregroundStyle="secondaryLabel" background="secondarySystemFill" clipShape={{ type: "rect", cornerRadius: 8 }} />
      }
      <VStack alignment="leading" spacing={2}>
        <Text font="headline" lineLimit={1} foregroundStyle={isPlaying ? "accentColor" : undefined}>{music.title}</Text>
        <Text font="subheadline" foregroundStyle="secondaryLabel" lineLimit={1}>{music.artist}</Text>
      </VStack>
      <Spacer />
      {isPlaying && <Image systemName="waveform" tint="accentColor" />}
    </HStack>
  )
}