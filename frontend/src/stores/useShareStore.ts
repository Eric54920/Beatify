import { ref } from 'vue'
import { defineStore } from 'pinia'
import { BASE_URL } from '@/config/conf'
import { Song } from '@/schema/schema'
import { lang, setUserLanguage } from '@/i18n'

export const useSharedStore = defineStore('shared', {
  state: () => ({
    currentMusic: ref<Song>(),
    pageName: "Home",                       // 页面名称
    currentDirId: 0,                        // 当前播放的目录
    currentMusicId: 0,                      // 当前播放的音乐
    isPlaying: false,                       // 播放状态
    currentTime: 0,                         // 当前播放时间
    duration: 0,                            // 时长
    progress: 0,                            // 进度
    playMode: 1,                            // 播放模式（列表循环）2: 单曲循环 3：随机
    volume: 0.3,                            // 默认音量
    sort: 'title ASC',                      // 排序
    coverImage: `${BASE_URL}/cover?id=0`,   // 专辑封面
    isShowHistory: false,                   // 是否打开待播和播放历史
    isHistoryUpdated: false,                // 是否已更新历史列表
    insertMusicId: 0,                       // 插播音乐
    manuallyAddedListUpdated: false,        // 是否已更新手动添加列表
    playNextList: ref<Song[]>([]),          // 待播列表
    lang: lang                              // 语言
  }),
  actions: {
    setCurrentMusicId(val: number) {
      this.currentMusicId = val
    },
    setPlayStatus(val: boolean) {
      this.isPlaying = val
    },
    setCurrentTime(val: number) {
      this.currentTime = val
    },
    setDuration(val: number) {
      this.duration = val
    },
    setProgress(val: number) {
      this.progress = val
    },
    setPlayMode(val: number) {
      this.playMode = val
    },
    setVolume(val: number) {
      this.volume = val
    },
    setCurrentDirId(val: number) {
      this.currentDirId = val
    },
    setPageName(val: string) {
      this.pageName = val
    },
    setCurrentMusic(song: Song) {
      this.currentMusic = song
    },
    setSort(val: string) {
      this.sort = val
    },
    setLanguage(val: string) {
      this.lang = val;
      setUserLanguage(val)
    }
  }
})
