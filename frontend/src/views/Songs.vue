<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { GetSongs } from '../../wailsjs/go/beatify/App'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import { useToast } from '@/components/ui/toast/use-toast'


const route = useRoute()
const dir = ref(Number(route.query.dir));
interface Song {
    id: number,
    title: string,
    artist: string,
    album: string,
    type: string,
    size: number,
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
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead class="w-[100px]">No.</TableHead>
                <TableHead>title</TableHead>
                <TableHead>artist</TableHead>
                <TableHead>album</TableHead>
                <TableHead>type</TableHead>
                <TableHead>size</TableHead>
                <TableHead class="text-right">update at</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            <TableRow v-for="(song, i) in songs" :key="song.id">
                <TableCell class="font-medium">
                    {{ i + 1 }}
                </TableCell>
                <TableCell>{{ song.title }}</TableCell>
                <TableCell>{{ song.artist }}</TableCell>
                <TableCell>{{ song.album }}</TableCell>
                <TableCell>{{ song.type }}</TableCell>
                <TableCell>{{ song.size }}</TableCell>
                <TableCell class="text-right">
                    {{ song.update_at }}
                </TableCell>
            </TableRow>
        </TableBody>
    </Table>
</template>