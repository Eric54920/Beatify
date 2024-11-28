<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSharedStore } from '@/stores/useShareStore'
import { Button } from '@/components/ui/button'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Song } from '@/schema/schema'

const store = useSharedStore();
const { t } = useI18n();
let storedHistoryList = ref<Song[]>([]);
let historyListLength = computed(() => storedHistoryList.value.length);

/**
 * 清空播放历史 
 */
const clearHistory = () => {
    localStorage.removeItem('historyList');
    getHistoryList();
};

/**
 * 获取播放历史
 */
const getHistoryList = () => {
    storedHistoryList.value = JSON.parse(localStorage.getItem('historyList') || '[]');
    store.isHistoryUpdated = false;
};

/**
 * 插播
 */ 
const insertPlay = (song: Song) => {
    store.insertMusicId = song.id;
    store.setCurrentMusic(song)
}

// 监控历史列表是否更新
watch(() => store.isHistoryUpdated, (isUpdated) => {
    if (isUpdated) {
        getHistoryList()
    }
})

onMounted(() => {
    getHistoryList();
});
</script>


<template>
    <div class="absolute w-80 h-screen right-0 bg-white bg-opacity-50 backdrop-blur z-[3] pt-14 border-l animate-slideIn" v-if="store.isShowHistory">
        <div class="p-2 h-full">
            <Tabs default-value="playingNext" class="w-full h-full">
                <TabsList class="grid w-full grid-cols-2">
                    <TabsTrigger value="playingNext">
                        {{ t("historyList.playingNext") }}
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        {{ t("historyList.history") }}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="playingNext">
                </TabsContent>

                <TabsContent value="history" class="h-full">
                    <ScrollArea class="overflow-auto" style="height: calc(100% - 40px);">
                        <div class="flex py-2 items-center cursor-pointer hover:text-red-500" v-for="(song, i) in storedHistoryList" @dblclick="insertPlay(song)">
                            <div class="h-10 w-10 shrink-0 overflow-hidden rounded bg-white mr-2">
                                <img class="p-2" src="@/assets/images/icons8-audio-wave.gif" alt="" v-if="store.currentMusic?.id == song.id">
                                <img :src="song.cover" alt="" v-else-if="song.cover">
                                <img :src="`http://localhost:34116/cover?id=${song.id}`" alt="" v-else>
                            </div>
                            <div class="flex-1">
                                <p class="text-sm overflow-hidden text-ellipsis whitespace-nowrap">{{ song.title }}</p>
                                <p class="text-xs text-stone-600 overflow-hidden text-ellipsis whitespace-nowrap">
                                    <span>{{ song.artist }}</span>  
                                    <span v-if="song.album"> 一 {{ song.album }}</span>  
                                </p>
                            </div>
                        </div>
                        <div class="py-2" v-if="historyListLength > 0">
                            <Button class="w-full" @click="clearHistory">{{ t("historyList.clear") }}（{{ historyListLength }} / 50）</Button>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    </div>
</template>