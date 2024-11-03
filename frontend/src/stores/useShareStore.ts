import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Song } from '../schema/schema'

export const useSharedStore = defineStore('shared', {
  state: () => ({
    currentMusic: ref<Song>(),
    pageName: "Home", // 页面名称
    currentDirId: 0, // 当前播放的目录
    currentMusicId: 0,  // 需要共享的属性
    isPlaying: false,  // 播放状态
    currentTime: 0,  // 当前播放时间
    progress: 0,  // 进度
    playMode: 1,  // 播放模式（列表循环）2: 单曲循环 3：随机
    volume: 0.3,  // 默认音量
    sort: 'title ASC'  // 排序
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
    }
  }
})
