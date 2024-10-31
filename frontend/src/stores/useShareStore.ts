import { defineStore } from 'pinia'

export const useSharedStore = defineStore('shared', {
  state: () => ({
    currentMusicId: '',  // 需要共享的属性
    isPlaying: false,  // 播放状态
    currentTime: 0,  // 当前播放时间
    progress: 0,  // 进度
    playMode: 1,  // 播放模式
    volume: 0.3  // 默认音量
  }),
  actions: {
    setCurrentMusic(val: string) {
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
    setVolume(val:number) {
      this.volume = val
    }
  }
})
