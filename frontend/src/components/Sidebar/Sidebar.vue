<script setup lang=ts>
import { ref, onMounted } from 'vue'
import { useForm } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import { Playlist } from '@/schema/schema'
import { playlistFormSchema } from "@/schema/schema"
import { GetAllDirs, GetDir, DeleteDir, UpdateDir, CreateDir, ReSyncDir } from 'wailsjs/go/beatify/App'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area';
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from '@/components/ui/form'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    Music2,
    Search,
    ChevronsUpDown,
    ListMusic,
    CirclePlus,
    Ellipsis,
    FolderSync,
    Bolt,
    Trash2
} from 'lucide-vue-next'
import SidebarBottom from '@/components/Sidebar/SidebarBottom/SidebarBottom.vue'

const { t } = useI18n()
const playlists = ref<Playlist[]>([])
const isPlaylistsOpen = ref(false); // 是否展开播放列表
const isPlaylistAddDialogOpen = ref(false); // 新增表单
const isPlaylistUpdateDialogOpen = ref(false); // 更新表单
const playlistDetail = ref<Playlist>(); // 播放列表详情 
const playlistFormFields = [
    { name: "title", labelKey: "diolog.title", type: "text" },
    { name: "url", labelKey: "diolog.url", type: "text" }
]
const playlistForm = useForm({
    validationSchema: playlistFormSchema,
})

/**
 * 获取所有播放列表
 */
const getPlaylist = () => {
    GetAllDirs().then((res: Record<string, any>) => {
        switch (res.status) {
        case 50000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryRecordError"),
            })
            break
        case 20000:
            playlists.value = res.data
            break
        }
    })
}

/**
 * 添加播放列表
 */
const addPlaylist = () => {
    isPlaylistAddDialogOpen.value = true;
}

/**
 * 保存新增播放列表
 */
const saveNewPlaylist = playlistForm.handleSubmit((values) => {
    CreateDir(JSON.stringify(values)).then((res: Record<string, any>) => {
        switch (res.status) {
        case 50000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.createDirError"),
            })
            break
        case 50004:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.pullFileError"),
            })
            break
        case 50005:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.saveSongError"),
            })
            break
        case 40001:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.TitleOrUrlExisted"),
            })
            break
        case 40000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.invalidForm"),
            })
            break
        case 20000:
            toast({
                title: t("notification.successTitle")
            })
            isPlaylistAddDialogOpen.value = false;
            break
        }
        getPlaylist();
    })
})

/**
 * 编辑播放列表
 */
const editPlaylist = (id: number) => {
    GetDir(id).then((res: Record<string, any>) => {
        if (res.status == 50000) {
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryDirError"),
            })
            return
        }
        playlistDetail.value = res.data;
        playlistForm.setValues(res.data);
    })
    isPlaylistUpdateDialogOpen.value = true;
}

/**
 * 保存更新播放列表
 */
const updatePlaylistConfig = playlistForm.handleSubmit((values) => {
    UpdateDir(playlistDetail.value!.id, JSON.stringify(values)).then((res: Record<string, any>) => {
        switch (res.status) {
        case 50001:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.saveDirError"),
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
        case 40001:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.TitleOrUrlExisted"),
            })
            break
        case 40004:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.RecordNotFound"),
            })
            break
        case 20000:
            // 重新获取播放列表列表
            getPlaylist()
            // 关闭表单
            isPlaylistUpdateDialogOpen.value = false
            break
        }
    })
})

/**
 * 重新同步歌曲列表
 */
const reSyncPlaylist = (id: number) => {
    ReSyncDir(id).then((res) => {
        switch (res.status) {
        case 50004:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.syncError"),
            })
            break
        case 50003:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.pullFileError"),
            })
            break
        case 50002:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryMusicError"),
            })
            break
        case 50000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.deleteExistingSongError"),
            })
            break
        case 20000:
            toast({
                title: t("notification.successTitle"),
                description: t("notification.syncSuccess"),
            })
        }
    })
}

/**
 * 删除播放列表
 */
const deletePlaylist = (id: number) => {
    DeleteDir(id).then((res: Record<string, any>) => {
        switch (res.status) {
        case 50000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.deleteDirError"),
            })
            break
        case 20000:
            getPlaylist()
            break
        }
    })
}

onMounted(() => {
    getPlaylist()
})
</script>

<template>
    <div class="w-52 h-full flex-col justify-between bg-stone-100">
        <!-- 头部 -->
        <div class="h-14 p-2 px-3">
            <div class="relative w-full items-center">
                <Input id="search" type="text" :placeholder='`${t("menu.search")}`' class="pl-10" />
                <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
                    <Search class="size-6 text-muted-foreground" />
                </span>
            </div>
        </div>

        <!-- 内容 -->
        <ScrollArea class="flex-1 p-2 px-3" style="height: calc(100% - 112px)">
            <div class="mb-2">
                <div class="px-2 text-sm text-stone-500 font-medium mb-2">{{ t("menu.library") }}</div>
                <RouterLink :to="`/main/songs?dir=0&pageName=${t('menu.songs')}`">
                    <Button variant="ghost" size="sm"
                        class="w-full flex items-center justify-start p-2 hover:bg-red-500 hover:text-white">
                        <Music2 class="h-4 w-4 mr-2" /> <span>{{ t("menu.songs") }}</span>
                    </Button>
                </RouterLink>
            </div>

            <div class="flex item-center justify-between px-2 text-sm text-stone-500 font-medium mb-2">
                <span>{{ t("menu.playlists") }}</span>
                <span class="flex items-center cursor-pointer" @click="addPlaylist">
                    <CirclePlus class="h-4 w-4 text-red-500" />
                </span>
            </div>

            <Collapsible v-model:open="isPlaylistsOpen" class="w-full space-y-2">
                <CollapsibleTrigger as-child>
                    <Button variant="ghost" size="sm"
                        class="w-full px-2 flex justify-between hover:bg-red-500 hover:text-white">
                        <h4 class="flex items-center justify-start text-sm font-semibold">
                            <ListMusic class="h-4 w-4 mr-2" />
                            <span>{{ t("menu.playlists") }}</span>
                        </h4>
                        <ChevronsUpDown class="h-4 w-4" />
                        <span class="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>

                <CollapsibleContent class="space-x-2">
                    <div class="ml-2 border-l border-stone-300 pl-2">
                        <div v-for="(playlist, i) in playlists" :key="`${playlist}-${i}`"
                            class="flex justify-between items-center hover:bg-stone-200 hover:text-stone-900 cursor-pointer p-2 rounded">
                            <RouterLink :to="`/main/songs?dir=${playlist.id}&pageName=${playlist.title}`"
                                class="flex-1 ">
                                <div class="w-full text-sm text-stone-600">{{ playlist.title }}</div>
                            </RouterLink>
                            <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <Ellipsis class="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem @click="reSyncPlaylist(playlist.id)">
                                            <FolderSync class="mr-2 h-4 w-4" />
                                            {{ t("menu.sync") }}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem @click="editPlaylist(playlist.id)">
                                            <Bolt class="mr-2 h-4 w-4" />
                                            {{ t("menu.edit") }}
                                        </DropdownMenuItem>
                                        <AlertDialogTrigger as-child>
                                            <DropdownMenuItem>
                                                <Trash2 class="mr-2 h-4 w-4" />
                                                {{ t("menu.delete") }}
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{{ t("diolog.deleteConfirm") }}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        {{ t("diolog.deleteConfirmDesc") }}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{{ t("diolog.cancel") }}</AlertDialogCancel>
                                        <AlertDialogAction @click="deletePlaylist(playlist.id)">{{ t("diolog.continue") }}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </ScrollArea>

        <!-- 底部 -->
        <div class="h-14 p-2 px-3">
            <SidebarBottom />
        </div>
    </div>

    <Toaster />

    <!-- 新增播放列表 -->
    <Dialog v-model:open="isPlaylistAddDialogOpen">
        <DialogContent class="w-[350px]">
            <DialogHeader>
                <DialogTitle>{{ t("diolog.addPlaylists") }}</DialogTitle>
            </DialogHeader>
            <form id="playlistForm" @submit="saveNewPlaylist" class="space-y-2">
                <template v-for="(field, index) in playlistFormFields">
                    <FormField v-slot="{ componentField }" :name="field.name">
                        <FormItem>
                            <FormLabel>{{ t(field.labelKey) }}</FormLabel>
                            <FormControl>
                                <Input :type="field.type" v-bind="componentField" />
                            </FormControl>
                        </FormItem>
                    </FormField>
                </template>
                <Button type="submit" class="mt-6 w-full">{{ t("diolog.save") }}</Button>
            </form>
        </DialogContent>
    </Dialog>

    <!-- 更新播放列表 -->
    <Dialog v-model:open="isPlaylistUpdateDialogOpen">
        <DialogContent class="w-[350px]">
            <DialogHeader>
                <DialogTitle>{{ t("diolog.editPlaylists") }}</DialogTitle>
            </DialogHeader>
            <form id="playlistUpdateForm" @submit="updatePlaylistConfig" class="space-y-2">
                <template v-for="(field, index) in playlistFormFields" :key="index">
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
        </DialogContent>
    </Dialog>
</template>