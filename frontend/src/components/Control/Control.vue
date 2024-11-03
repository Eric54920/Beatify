<script lang="ts" setup>
import { watch, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n'
import { useSharedStore } from '@/stores/useShareStore';
import { PlayNext } from '../../../wailsjs/go/beatify/App'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import { useToast } from '@/components/ui/toast/use-toast'

const { t } = useI18n()
const store = useSharedStore()
const audioPlayer = ref<HTMLAudioElement | null>(null);
const audioUrl = ref("")


// 暂停、播放
const playAndPause = () => {
    if (store.isPlaying) {
        audioPlayer.value!.pause()
    } else {
        audioPlayer.value!.play().catch((error) => {
            // 如果 play() 被中断，捕获异常处理
            toast({
                title: t("notification.errorToPlay")
            })
        });
    }
}

/**
 * 切换播放模式 1: 列表循环 2: 单曲循环 3：随机 
 */ 
const changeMode = (mode: string) => {
    if (mode == "random") {
        if (store.playMode == 3) {
            store.setPlayMode(1)  // 列表循环
        } else {
            store.setPlayMode(3)  // 随机
        }
    }

    if (mode == "repeat") {
        if (store.playMode == 1) {
            store.setPlayMode(2)  // 单曲循环
        } else if (store.playMode == 2 || store.playMode == 3) {
            store.setPlayMode(1)  // 列表循环
        }
    }
}

/**
 * 下一首
 */ 
const playNext = () => {
    PlayNext(store.sort, store.currentMusicId, 1, store.currentDirId).then((res: Record<string, any>) => {
        if (res.status == 20000) {
            let nextSong = res.data;
            store.setCurrentMusicId(nextSong["id"])
            store.setCurrentDirId(nextSong["dir"])
            store.setCurrentMusic(nextSong)
        }
    })
}

// 上一首、下一首
// 循环（单曲、列表）
// 进度条拖拽
// 音量（禁音）


// 当音频加载完毕可以播放时
const handleCanPlayThrough = () => {
    if (audioPlayer.value) {
        audioPlayer.value.play().catch((error) => {
            if (error.name !== "AbortError") {
                toast({
                    title: t("notification.errorToPlay")
                })
            }
        });
    }
}

// 歌曲播完之后
const handleAudioEnded = () => {
    /* 处理下一首、循环播放等 */
    if (store.playMode == 2) {  // 单曲循环
        audioPlayer.value!.play()
    } else {
        playNext();
    }
}

watch(() => store.currentMusicId, (id) => {
    // 先暂停
    audioPlayer.value!.pause()
    audioUrl.value = "http://localhost:34116/stream?id=" + id
    audioPlayer.value!.load()
})

onMounted(() => {
    const { toast } = useToast()

    if (audioPlayer.value) {
        audioPlayer.value.volume = store.volume

        // 更新播放和暂停状态
        audioPlayer.value.addEventListener('play', () => {
            store.setPlayStatus(true)
        });

        audioPlayer.value.addEventListener('pause', () => {
            store.setPlayStatus(false)
        });

        // 更新进度条和时间
        audioPlayer.value.addEventListener('timeupdate', () => {
            store.setProgress((audioPlayer.value!.currentTime / audioPlayer.value!.duration) * 100)

            // 时间
            // currentTimeEl.textContent = formatTime(audio.currentTime);
            // durationEl.textContent = formatTime(audio.duration);
        });

        // 元信息重载时更新时间
        audioPlayer.value.addEventListener('loadedmetadata', () => {
            // durationEl.textContent = formatTime(audio.duration);
            let time = audioPlayer.value!.duration
            store.setCurrentTime(time)
        });

        // 进度条拖拽
        // progressBar.value.addEventListener('input', (e) => {
        //   const seekTime = (e.target.value / 100) * audio.value.duration;
        //   audio.value.currentTime = seekTime;
        // });

        // 音量调节
        // volumeBar.value.addEventListener('input', (e) => {
        //   audio.volume = e.target.value;
        // });
    }
})
</script>

<template>
    <Toaster />

    <div class="h-14 flex justify-center p-1">
        <div class="w-60 min-w-60 flex justify-evenly items-center">
            <audio ref="audioPlayer" :src="audioUrl" @canplaythrough="handleCanPlayThrough" @ended="handleAudioEnded"></audio>
            <!-- 随机 -->
            <button class="w-10 h-10 flex justify-center items-center" @click="changeMode('random')" v-if="store.playMode == 3">
                <font-awesome-icon class="text-red-500 text-md" icon="shuffle" />
            </button>
            <button class="w-10 h-10 flex justify-center items-center" @click="changeMode('random')" v-if="store.playMode != 3">
                <font-awesome-icon class="text-stone-500 text-md" icon="shuffle" />
            </button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-2xl" icon="backward" /></button>
            <button class="w-10 h-10 flex justify-center items-center" @click="playAndPause">
                <font-awesome-icon class="text-stone-500 text-2xl" :icon="store.isPlaying?'pause':'play'" />
            </button>
            <button class="w-10 h-10 flex justify-center items-center" @click="playNext"><font-awesome-icon class="text-stone-500 text-2xl" icon="forward" /></button>
            <!-- 循环 -->
            <button class="w-10 h-10 flex justify-center items-center" @click="changeMode('repeat')" v-if="store.playMode == 1 || store.playMode == 3">
                <font-awesome-icon class="text-stone-500 text-md" icon="repeat" />
            </button>
            <button class="w-10 h-10 flex justify-center items-center relative" @click="changeMode('repeat')" v-if="store.playMode == 2">
                <font-awesome-icon class="text-red-500 text-md" icon="repeat" />
                <span class="absolute text-red-500" style="font-size:0.5rem;font-weight:600">1</span>
            </button>
        </div>
        <div class="flex-1 flex border box-border w-96 max-w-96">
            <div class="h-full aspect-square overflow-hidden">
                <img class="h-full" src="@/assets/images/default_pic.png">
            </div>
            <div class="flex flex-1 flex-col overflow-hidden">
                <div class="h-full flex flex-1 flex-col justify-center overflow-hidden px-2 text-center" v-if="store.currentMusic">
                    <p class="text-sm text-nowrap text-stone-800">{{ store.currentMusic?.title }}</p>
                    <span class="text-xs text-nowrap text-stone-500">{{ store.currentMusic?.artist }}</span>
                </div>
                <div class="h-full overflow-hidden px-2" v-else>
                    <p class="h-full flex text-nowrap text-stone-500 items-center justify-center font-semibold">Enjoy</p>
                </div>
                <div class="h-1 bg-stone-200">
                    <div class="h-full bg-stone-500" :style="{ width: store.progress + '%'}"></div>
                </div>
            </div>
        </div>
        <div class="w-60 min-w-60 flex">
            <div class="flex-1 flex justify-center items-center">
                <button class="w-10 h-10"><font-awesome-icon class="text-stone-500 text-md" icon="volume-low" /></button>
                <div class="flex-1 h-1 bg-stone-200">
                    <div class="h-full bg-stone-500" style="width: 30%"></div>
                </div>
                <button class="w-10 h-10"><font-awesome-icon class="text-stone-500 text-md" icon="volume-high" /></button>
            </div>
            <div class="w-10  flex justify-center items-center">
                <button class="w-10 h-10"><font-awesome-icon class="text-stone-500 text-md" icon="list-ul" /></button>
            </div>
        </div>
    </div>
</template>