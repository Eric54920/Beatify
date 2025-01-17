<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useForm } from 'vee-validate';
import { songDetailFormFields } from "@/constants/fields"
import { songDetailFormSchema } from "@/schema/schema"
import { GetSongs, GetSong, UpdateSong, SearchSongs } from 'wailsjs/go/beatify/App'
import { BASE_URL } from '@/config/conf';
import { formatSize, playFromSongList } from '@/utils/utils';
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Info,
    Ellipsis,
    ArrowUp,
    ArrowDown,
    ListStart,
    ListEnd
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form'
import { useSharedStore } from '@/stores/useShareStore'
import { Song } from '@/schema/schema'

const store = useSharedStore()
const route = useRoute()
const { t } = useI18n()
const dir = ref(Number(route.query.dir));
const sort = ref(store.sort);
const songs = ref<Song[]>([])
const isInfoDialogOpen = ref(false)
const songDetail = ref<Song>()

const { handleSubmit, setValues } = useForm({
  validationSchema: songDetailFormSchema,
});

/**
 * 保存歌曲详细信息
 */ 
const saveSongDetail = handleSubmit((values) => {
    UpdateSong(songDetail.value!.id, JSON.stringify(values)).then((res: Record<string, any>) => {
        switch (res.status) {
        case 50001:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.saveSongError"),
            })
            break
        case 50000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryRecordError"),
            })
            break
        case 40000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.invalidForm"),
            })
            break
        case 40004:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.RecordNotFound"),
            })
            break
        case 20000:
            // 重新获取歌曲列表
            getSongs()
            // 关闭表单
            isInfoDialogOpen.value = false
            break
        }
    })
});

/**
 * 展示歌曲信息 
 */
const showDetail = (songId: number) => {
    GetSong(songId).then((res: Record<string, any>) => {
        if (res.status == 50000) {
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryMusicError"),
            })
            return
        }
        songDetail.value = res.data
        // 给表单赋值
        setValues(res.data)
        isInfoDialogOpen.value = true
    })
}

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
            break
        case 20000:
            songs.value = res.data;
            break
        }
    })
}

/**
 * 切换列表排序方式
 */
const sortChange = (sort: string) => {
    let newSort = ""
    switch (sort) {
        case 'title':
            newSort = store.sort == 'title ASC' ? 'title DESC' : 'title ASC'
            break;
        case 'artist':
            newSort = store.sort == 'artist ASC' ? 'artist DESC' : 'artist ASC'
            break;
        case 'album':
            newSort = store.sort == 'album ASC' ? 'album DESC' : 'album ASC'
            break;
        default:
            break;
    }
    store.setSort(newSort)
}

/**
 * 将歌曲添加到当前播放列表
 */
const addToPlayNext = (song: Song, pos: number) => {
    const manuallyAddedList = JSON.parse(localStorage.getItem('manuallyAddedList') || '[]');

    if (pos == 1) {
        manuallyAddedList.unshift(song);
    } else {
        manuallyAddedList.push(song);
    }

    localStorage.setItem('manuallyAddedList', JSON.stringify(manuallyAddedList));
    store.manuallyAddedListUpdated = true;
}

/**
 * 搜索歌曲
 */
const searchSongs = (content: string) => {
    SearchSongs(sort.value, content).then((res: Record<string, any>) => {
        switch (res.status) {
        case 50000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryMusicError"),
            })
            break
        case 20000:
            songs.value = res.data;
            break
        }
    })
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

watch(() => store.searchContent, (content) => {
    if (content) {
        searchSongs(content);
    } else {
        getSongs();
    }
})

onMounted(() => {
    // 获取所有歌曲
    getSongs()
})
</script>

<template>
    <Toaster />

    <ScrollArea class="h-full text-sm text-center">
        <div class="sticky top-0 bg-white bg-opacity-50 backdrop-blur-lg z-[2]">
            <div class="py-2 text-center font-semibold text-stone-700 text-sm">
                {{ store.pageName }}
            </div>
            <div class="flex flex-row px-2 h-12 items-center text-stone-700 font-semibold border-b">
                <div class="basis-1/12"></div>
                <div class="basis-3/12 text-left flex items-center" @click="sortChange('title')">{{ t("songInfo.title") }}
                    <ArrowDown class="ml-1 h-4 w-4 inline-block" v-if="store.sort == 'title ASC'" />
                    <ArrowUp class="ml-1 h-4 w-4 inline-block" v-if="store.sort == 'title DESC'" />
                </div>
                <div class="basis-1/12"></div>
                <div class="basis-2/12 text-left flex items-center" @click="sortChange('artist')">{{ t("songInfo.artist") }}
                    <ArrowDown class="ml-1 h-4 w-4 inline-block" v-if="store.sort == 'artist ASC'" />
                    <ArrowUp class="ml-1 h-4 w-4 inline-block" v-if="store.sort == 'artist DESC'" />
                </div>
                <div class="basis-3/12 text-left flex items-center" @click="sortChange('album')">{{ t("songInfo.album") }}
                    <ArrowDown class="ml-1 h-4 w-4 inline-block" v-if="store.sort == 'album ASC'" />
                    <ArrowUp class="ml-1 h-4 w-4 inline-block" v-if="store.sort == 'album DESC'" />
                </div>
                <div class="basis-1/12">{{ t("songInfo.type") }}</div>
                <div class="basis-1/12">{{ t("songInfo.size") }}</div>
            </div>
        </div>

        <div class="flex flex-row px-2 h-12 items-center hover:bg-stone-100 transition even:bg-stone-50"
            v-for="(song, i) in songs" :key="song.id" @dblclick="playFromSongList(song, dir, store)">
            <div class="basis-1/12 flex justify-center">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded bg-white">
                    <img class="p-2" src="@/assets/images/icons8-audio-wave.gif" alt="" v-if="store.currentMusic?.id == song.id">
                    <img :src="song.cover" alt="" v-else-if="song.cover">
                    <img :src="`${BASE_URL}/cover?id=${song.id}`" alt="" v-else>
                </div>
            </div>
            <div class="basis-3/12 text-left overflow-hidden overflow-ellipsis text-nowrap"
                :class="{ 'text-red-500': store.currentMusic?.id == song.id }">{{ song.title }}</div>
            <div class="basis-1/12 flex justify-center text-stone-600">
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Ellipsis class="mr-2 h-4 w-4 text-red-600" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent class="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuItem @click="showDetail(song.id)">
                                <Info class="mr-2 h-4 w-4" />
                                <span>{{ t("songInfo.viewDetail") }}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem @click="addToPlayNext(song, 1)">
                                <ListStart class="mr-2 h-4 w-4" />
                                <span>{{ t("songInfo.playNext") }}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem @click="addToPlayNext(song, 2)">
                                <ListEnd class="mr-2 h-4 w-4" />
                                <span>{{ t("songInfo.playLast") }}</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div class="basis-2/12 text-left text-stone-600 overflow-hidden overflow-ellipsis text-nowrap">{{song.artist }}</div>
            <div class="basis-3/12 text-left text-stone-600 overflow-hidden overflow-ellipsis text-nowrap">{{ song.album}}</div>
            <div class="basis-1/12">
                <Badge variant="outline" class="text-stone-600">{{ song.type }}</Badge>
            </div>
            <div class="basis-1/12 text-stone-600">{{ formatSize(song.size) }} MB</div>
        </div>
    </ScrollArea>

    <!-- 更新歌曲信息 -->
    <Dialog v-model:open="isInfoDialogOpen">
        <DialogContent class="sm:max-w-[700px]">
            <DialogHeader>
                <DialogTitle>{{ t("songInfo.musicDetails") }}</DialogTitle>
            </DialogHeader>
            <div class="flex">
                <div class="w-80 pr-5 flex items-center">
                    <div class="w-full">
                        <div class="h-52 w-52 mx-auto mb-5 overflow-hidden rounded bg-white border">
                            <img :src="songDetail!.cover" alt="" v-if="songDetail!.cover">
                            <img :src="`${BASE_URL}/cover?id=${songDetail!.id}`" alt="" v-else>
                        </div>
                        <div class="mb-3">
                            <p class="mb-1 text-base font-medium">{{ t("songInfo.path") }}</p>
                            <p class="text-stone-500 text-xs">{{ songDetail!.path }}</p>
                        </div>
                        <div class="mb-3">
                            <p class="mb-1 text-base font-medium">{{ t("songInfo.type") }}</p>
                            <p class="text-stone-500 text-xs">{{ songDetail!.type }}</p>
                        </div>
                        <div class="mb-3">
                            <p class="mb-1 text-base font-medium">{{ t("songInfo.size") }}</p>
                            <p class="text-stone-500 text-xs">{{ formatSize(songDetail!.size) }} MB</p>
                        </div>
                    </div>
                </div>

                <div class="flex-1">
                    <form id="dialogForm" @submit="saveSongDetail">
                        <template v-for="(field, index) in songDetailFormFields" :key="index">
                            <FormField v-slot="{ componentField }" :name="field.name">
                                <FormItem>
                                    <FormLabel>{{ t(field.labelKey) }}</FormLabel>
                                    <FormControl>
                                        <Input :type="field.type" v-bind="componentField" />
                                    </FormControl>
                                </FormItem>
                            </FormField>
                        </template>
                        
                        <Button type="submit" class="mt-6 w-full">{{ t("diolog.saveChanges") }}</Button>
                    </form>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>