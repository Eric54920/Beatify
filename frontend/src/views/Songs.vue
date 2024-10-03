<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'


const route = useRoute()
const dir = ref(0);
const songs = [
  {
    id: 1,
    title: "夜曲",
    artist: "周杰伦",
    album: "夜曲",
    type: "flac",
    size: 14.3,
    update_at: "2024-09-10 12:12:12"
  }
]

// 检测路由中参数的变化
watch(() => route.query.dir, (newDir) => {
    console.log(newDir)
})

onMounted(() => {
    dir.value = route.query.dir;

    console.log(dir.value)
})
</script>

<template>
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
            <TableRow v-for="song in songs" :key="song.id">
                <TableCell class="font-medium">
                    {{ song.id }}
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