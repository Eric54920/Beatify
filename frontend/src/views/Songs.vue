<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { GetSongs } from '../../wailsjs/go/beatify/App'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import { useToast } from '@/components/ui/toast/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'


const route = useRoute()
const dir = ref(Number(route.query.dir));
interface Song {
    id: number,
    title: string,
    artist: string,
    album: string,
    type: string,
    size: number,
    time: number,
    update_at: string
}
const songs = ref<Song[]>([])

const getSongs = () => {
    /* 获取所有歌曲 */
    GetSongs(dir.value).then((res: Record<string, any>) => {
        if (res.status == 500) {
            toast({
                title: "发生了一些异常",
                description: res.msg,
            })
        } else {
            songs.value = res.data;
        }
    })
}

const formatTime = (time: number) => {
    /* 将秒转为分 */
    return `${time / 60 | 0}:${(time % 60).toString().padStart(2, '0')}`
}

// 检测路由中参数的变化
watch(() => route.query.dir, (newDir) => {
    // 重新获取所有歌曲
    dir.value = Number(newDir);
    getSongs()
    console.log(dir.value, songs)
})

onMounted(() => {
    const { toast } = useToast()

    // 获取所有歌曲
    getSongs()
})
</script>

<template>
    <Toaster />

    <ScrollArea class="h-full overflow-y-auto text-sm text-center">
        <div class="flex flex-row px-2 h-12 items-center text-stone-500 font-semibold border-b">
            <div class="basis-1/12">No.</div>
            <div class="basis-3/12 text-left">Title</div>
            <div class="basis-2/12 text-left">Artist</div>
            <div class="basis-3/12 text-left">Album</div>
            <div class="basis-1/12">Type</div>
            <div class="basis-1/12">Size</div>
            <div class="basis-1/12">Time</div>
        </div>
        <div class="flex flex-row px-2 h-12 items-center border-b last-of-type:border-none hover:bg-stone-100 transition"
            v-for="(song, i) in songs" :key="song.id">
            <div class="basis-1/12 text-stone-600">{{ i + 1 }}</div>
            <div class="basis-3/12 text-left">{{ song.title }}</div>
            <div class="basis-2/12 text-left text-stone-600">{{ song.artist }}</div>
            <div class="basis-3/12 text-left text-stone-600">{{ song.album }}</div>
            <div class="basis-1/12 text-stone-600">{{ song.type }}</div>
            <div class="basis-1/12 text-stone-600">{{ song.size }} MB</div>
            <div class="basis-1/12 text-stone-600">{{ formatTime(song.time) }}</div>
        </div>
    </ScrollArea>
</template>