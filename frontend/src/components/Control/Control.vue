<script lang="ts" setup>
import { watch, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n'
import { useSharedStore } from '@/stores/useShareStore';
import { PlayNext, PlayPrev } from '../../../wailsjs/go/beatify/App'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import { useToast } from '@/components/ui/toast/use-toast'

const { t } = useI18n()
const store = useSharedStore()
const audioPlayer = ref<HTMLAudioElement>()
const audioUrl = ref("")
const progressContainer = ref<HTMLDivElement>()
const volumeContainer = ref<HTMLDivElement>()
let isDraggingProgress = ref(false)
let isDraggingVolume = ref(false)


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
const playNext = (mode: number) => {
    if (mode == 2) {  // 手动点击下一首，当模式为单曲循环时，要播下一首
        mode = 1
    }
    PlayNext(store.sort, store.currentMusicId, mode, store.currentDirId).then((res: Record<string, any>) => {
        if (res.status == 20000) {
            let nextSong = res.data;
            store.setCurrentMusicId(nextSong["id"])
            // store.setCurrentDirId(nextSong["dir"])
            store.setCurrentMusic(nextSong)
        }
    })
}

/**
 * 上一首 
 */ 
const playPrev = (mode: number) => {
    if (mode == 2) {  // 手动点击下一首，当模式为单曲循环时，要播下一首
        mode = 1
    }
    PlayPrev(store.sort, store.currentMusicId, mode, store.currentDirId).then((res: Record<string, any>) => {
        if (res.status == 20000) {
            let nextSong = res.data;
            store.setCurrentMusicId(nextSong["id"])
            // store.setCurrentDirId(nextSong["dir"])
            store.setCurrentMusic(nextSong)
        }
    })
}

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
        playNext(store.playMode);
    }
}

/**
 * 将位置转换为百分比并更新进度条 
 */ 
const updateProgress = (positionX: number) => {
    const containerRect = progressContainer.value!.getBoundingClientRect();
    let percentage = ((positionX - containerRect.left) / containerRect.width);
    percentage = Math.min(Math.max(percentage, 0), 1);
    const seekTime = percentage * store.duration;
    audioPlayer.value!.currentTime = seekTime;
};

/**
 * 将位置转换为百分比并调整音量
 */ 
const updateVolume = (positionX: number) => {
    const containerRect = volumeContainer.value!.getBoundingClientRect();
    let percentage = ((positionX - containerRect.left) / containerRect.width);
    percentage = Math.min(Math.max(percentage, 0), 1);
    store.volume = percentage
    audioPlayer.value!.volume = percentage
};

/**
 * 最小音量 
 */ 
const minVolume = () => {
    store.volume = 0
    audioPlayer.value!.volume = 0
}

/**
 * 最大音量 
 */ 
const maxVolume = () => {
    store.volume = 1
    audioPlayer.value!.volume = 1
}

window.addEventListener('mouseup', () => {
    isDraggingProgress.value = false;
    isDraggingVolume.value = false;
});

window.addEventListener('mousemove', (e) => {
    if (isDraggingProgress.value) {
        updateProgress(e.clientX);
    } else if (isDraggingVolume.value) {
        updateVolume(e.clientX);
    }
});

watch(() => store.currentMusicId, (id) => {
    // 先暂停
    audioPlayer.value!.pause()
    audioUrl.value = "http://localhost:34116/stream?id=" + id
    audioPlayer.value!.load()
    // 设置专辑封面
    store.coverImage = "http://localhost:34116/cover?id=" + id
})

onMounted(() => {
    const { toast } = useToast()

    // 音量调节
    if (volumeContainer.value) {
        volumeContainer.value!.addEventListener('mousedown', () => {
            isDraggingVolume.value = true;
        });

        volumeContainer.value!.addEventListener('click', (e) => {
            updateVolume(e.clientX);
        });
    }

    // 进度条调节
    if (progressContainer.value) {
        progressContainer.value!.addEventListener('mousedown', () => {
            isDraggingProgress.value = true;
        });

        progressContainer.value!.addEventListener('click', (e) => {
            updateProgress(e.clientX);
        });
    }

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
            let current = audioPlayer.value!.currentTime
            store.setProgress((current / audioPlayer.value!.duration) * 100)
            store.setCurrentTime(current)
        });

        // 元信息重载时更新时间
        audioPlayer.value.addEventListener('loadedmetadata', () => {
            // durationEl.textContent = formatTime(audio.duration);
            let time = audioPlayer.value!.duration
            store.setDuration(time)
        });
    }
})
</script>

<template>
    <Toaster />

    <div class="h-14 flex justify-evenly p-1">
        <div class="w-60 min-w-60 flex justify-evenly items-center">
            <audio ref="audioPlayer" :src="audioUrl" @canplaythrough="handleCanPlayThrough" @ended="handleAudioEnded"></audio>
            <!-- 随机 -->
            <button class="basis-2/12 h-10 flex justify-center items-center hover:bg-stone-100 hover:rounded" @click="changeMode('random')" v-if="store.playMode == 3">
                <font-awesome-icon class="text-red-500 text-md" icon="shuffle" />
            </button>
            <button class="basis-2/12 h-10 flex justify-center items-center hover:bg-stone-100 hover:rounded" @click="changeMode('random')" v-if="store.playMode != 3">
                <font-awesome-icon class="text-stone-500 text-md" icon="shuffle" />
            </button>
            <button class="basis-2/12 h-10 flex justify-center items-center hover:bg-stone-100 hover:rounded" @click="playPrev(store.playMode)">
                <font-awesome-icon class="text-stone-500 text-2xl" icon="backward" />
            </button>
            <button class="basis-2/12 h-10 flex justify-center items-center hover:bg-stone-100 hover:rounded" @click="playAndPause">
                <font-awesome-icon class="text-stone-500 text-2xl" :icon="store.isPlaying?'pause':'play'" />
            </button>
            <button class="basis-2/12 h-10 flex justify-center items-center hover:bg-stone-100 hover:rounded" @click="playNext(store.playMode)">
                <font-awesome-icon class="text-stone-500 text-2xl" icon="forward" />
            </button>
            <!-- 循环 -->
            <button class="basis-2/12 h-10 flex justify-center items-center hover:bg-stone-100 hover:rounded" @click="changeMode('repeat')" v-if="store.playMode == 1 || store.playMode == 3">
                <font-awesome-icon class="text-stone-500 text-md" icon="repeat" />
            </button>
            <button class="basis-2/12 h-10 flex justify-center items-center relative hover:bg-stone-100 hover:rounded" @click="changeMode('repeat')" v-if="store.playMode == 2">
                <font-awesome-icon class="text-red-500 text-md" icon="repeat" />
                <span class="absolute text-red-500" style="font-size:0.5rem;font-weight:600">1</span>
            </button>
        </div>
        <div class="flex-1 flex border box-border w-96 max-w-96">
            <div class="h-full aspect-square overflow-hidden">
                <img class="h-full" :src="store.coverImage" alt="">
            </div>
            <div class="flex flex-1 flex-col overflow-hidden" v-if="store.currentMusic">
                <div class="h-full flex flex-1 flex-col justify-center overflow-hidden px-2 text-center">
                    <p class="text-sm text-nowrap text-stone-800">{{ store.currentMusic?.title }}</p>
                    <span class="text-xs text-nowrap text-stone-500">{{ store.currentMusic?.artist }}</span>
                </div>
                <div class="h-1 bg-stone-200" ref="progressContainer">
                    <div class="h-full bg-stone-500" :style="{ width: store.progress + '%'}"></div>
                </div>
            </div>
            <div class="flex-1" v-else>
                <p class="h-full flex text-nowrap text-stone-500 items-center justify-center font-semibold">Listen With Beatify</p>
            </div>
        </div>
        <div class="w-60 min-w-60 flex justify-evenly items-center">
            <button class="basis-1/6 h-10 hover:bg-stone-100 hover:rounded" @click="minVolume"><font-awesome-icon class="text-stone-500 text-md" icon="volume-low" /></button>
            <div class="basis-2/6 h-1 bg-stone-200" ref="volumeContainer">
                <div class="h-full bg-stone-500" :style="{ width: store.volume * 100 + '%' }"></div>
            </div>
            <button class="basis-1/6 h-10 hover:bg-stone-100 hover:rounded" @click="maxVolume"><font-awesome-icon class="text-stone-500 text-md" icon="volume-high" /></button>
            <button class="basis-1/6 h-10 hover:bg-stone-100 hover:rounded"><font-awesome-icon class="text-stone-500 text-md" icon="list-ul" /></button>
        </div>
    </div>
</template>