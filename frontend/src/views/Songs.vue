<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { GetSongs } from '../../wailsjs/go/beatify/App'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import { useToast } from '@/components/ui/toast/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useSharedStore } from '@/stores/useShareStore'
import { Song } from '@/schema/schema'

const store = useSharedStore()
const route = useRoute()
const { t } = useI18n()
const dir = ref(Number(route.query.dir));
const sort = ref(store.sort);
const songs = ref<Song[]>([])

/**
 * 获取所有歌曲
 */ 
const getSongs = () => {
    GetSongs(dir.value, sort.value).then((res: Record<string, any>) => {
        switch (res.status) {
            case 50000:
                toast({
                    title: t("notification.errorTitle"),
                    description: t("notification.queryMusicError"),
                })
            case 20000:
                songs.value = res.data;
        }
    })
}

/**
 * 格式化时长，将秒转为分
 */ 
const formatTime = (time: number) => {
    return `${time / 60 | 0}:${(time % 60).toString().padStart(2, '0')}`
}

/**
 * 格式化文件大小
 */ 
const formatSize = (size: number) => {
    return (size / 1024 / 1024).toFixed(1)
}

/**
 * 双击列表项去播放音乐
 */
const toPlay = (song: Song) => {
    store.setCurrentMusicId(song.id)
    store.setCurrentDirId(dir.value)
    store.setCurrentMusic(song)
}

/**
 * 切换列表排序方式
 */ 
const sortChange = (sort: string) => {
    let newSort = ""
    switch (sort) {
        case 'title':
            newSort = store.sort == 'title ASC' ? 'title DESC': 'title ASC'
            break;
        case 'artist':
            newSort = store.sort == 'artist ASC' ? 'artist DESC': 'artist ASC'
            break;
        case 'album':
            newSort = store.sort == 'album ASC' ? 'album DESC': 'album ASC'
            break;
        default:
            break;
    }
    store.setSort(newSort)
}

// 检测路由中参数的变化
watch(() => route.query.dir, (newDir) => {
    // 重新获取所有歌曲
    dir.value = Number(newDir);
    getSongs()
})

// 检测排序方式的变化
watch(() => store.sort, (newSort) => {
    // 重新获取所有歌曲
    sort.value = newSort
    getSongs()
})

onMounted(() => {
    const { toast } = useToast()

    // 获取所有歌曲
    getSongs()
})
</script>

<template>
    <Toaster />

    <ScrollArea class="h-full text-sm text-center">
        <div class="sticky top-0 bg-white bg-opacity-50 backdrop-blur-lg z-10">
            <div class="py-2 text-center font-semibold text-stone-700 text-sm">
                {{ store.pageName }}
            </div>
            <div class="flex flex-row px-2 h-12 items-center text-stone-700 font-semibold border-b">
                <div class="basis-1/12">No.</div>
                <div class="basis-1/12"></div>
                <div class="basis-3/12 text-left" @click="sortChange('title')">{{ t("songInfo.title") }} 
                    <font-awesome-icon icon="sort-up" v-if="store.sort == 'title ASC'"/>
                    <font-awesome-icon icon="sort-down" v-if="store.sort == 'title DESC'"/>
                </div>
                <div class="basis-2/12 text-left" @click="sortChange('artist')">{{ t("songInfo.artist") }} 
                    <font-awesome-icon icon="sort-up" v-if="store.sort == 'artist ASC'"/>
                    <font-awesome-icon icon="sort-down" v-if="store.sort == 'artist DESC'"/>
                </div>
                <div class="basis-3/12 text-left" @click="sortChange('album')">{{ t("songInfo.album") }} 
                    <font-awesome-icon icon="sort-up" v-if="store.sort == 'album ASC'"/>
                    <font-awesome-icon icon="sort-down" v-if="store.sort == 'album DESC'"/>
                </div>
                <div class="basis-1/12">{{ t("songInfo.type") }}</div>
                <div class="basis-1/12">{{ t("songInfo.size") }}</div>
            </div>
        </div>
        
        <div class="flex flex-row px-2 h-12 items-center hover:bg-stone-100 transition even:bg-stone-50"
            v-for="(song, i) in songs" :key="song.id" @dblclick="toPlay(song)">
            <div class="basis-1/12 text-stone-600">{{ i + 1 }}</div>
            <div class="basis-1/12 text-stone-600">
                <div class="h-10 w-10 overflow-hidden rounded bg-white">
                    <img class="p-2" src="@/assets/images/icons8-audio-wave.gif" v-if="store.currentMusicId == song.id">
                    <img src="@/assets/images/default_pic.png" v-else>
                </div>
            </div>
            <div class="basis-3/12 text-left overflow-hidden overflow-ellipsis text-nowrap" :class="{'text-red-500': store.currentMusicId == song.id}">{{ song.title }}</div>
            <div class="basis-2/12 text-left text-stone-600 overflow-hidden overflow-ellipsis text-nowrap">{{ song.artist }}</div>
            <div class="basis-3/12 text-left text-stone-600 overflow-hidden overflow-ellipsis text-nowrap">{{ song.album }}</div>
            <div class="basis-1/12 text-stone-600"><Badge variant="outline">{{ song.type }}</Badge></div>
            <div class="basis-1/12 text-stone-600">{{ formatSize(song.size) }} MB</div>
        </div>
    </ScrollArea>
</template>