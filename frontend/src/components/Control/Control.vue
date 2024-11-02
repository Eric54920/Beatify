<script lang="ts" setup>
import { watch, ref, onMounted } from 'vue';
import { useSharedStore } from '@/stores/useShareStore';

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
            console.error("播放音频时出现问题：", error);
        });
    }
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
                console.error("Playback error:", error);
            }
        });
    }
}

// 歌曲播完之后
const handleAudioEnded = () => {
    /* 处理下一首、循环播放等 */
}

watch(() => store.currentMusicId, (id) => {
    // 先暂停
    audioPlayer.value!.pause()
    audioUrl.value = "http://localhost:34116/stream?id=" + id
    audioPlayer.value!.load()
})

onMounted(() => {
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
    <div class="h-14 flex justify-center p-1">
        <div class="w-60 min-w-60 flex justify-center items-center">
            <audio ref="audioPlayer" :src="audioUrl" @canplaythrough="handleCanPlayThrough" @ended="handleAudioEnded"></audio>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-md" icon="shuffle" /></button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-2xl" icon="backward" /></button>
            <button class="w-10 h-10 flex justify-center items-center" @click="playAndPause">
                <font-awesome-icon class="text-stone-500 text-2xl" :icon="store.isPlaying?'pause':'play'" />
            </button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-2xl" icon="forward" /></button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-md" icon="repeat" /></button>
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