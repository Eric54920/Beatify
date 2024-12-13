<script setup lang=ts>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import i18n from '@/i18n'
import { GetAllDirs, GetDir, DeleteDir, UpdateDir, CreateDir, ReSyncDir, GetAllConnections, UpdateConnection } from 'wailsjs/go/beatify/App'
import { WindowReload } from 'wailsjs/runtime/runtime'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
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
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
    Music2,
    Search,
    ChevronsUpDown,
    ListMusic,
    Settings,
    CirclePlus,
    Ellipsis,
    FolderSync,
    Bolt,
    Trash2,
    Server,
    Languages
} from 'lucide-vue-next'
import { Playlist } from '@/schema/schema'

const { t } = useI18n()
const playlists = ref<Playlist[]>([])
const isDialogOpen = ref(false); // 更新表单
const isAddDialogOpen = ref(false); // 新增表单
const dirDetail = ref<Playlist>(); // 目录详情 
const isOpen = ref(false) // 是否展开播放列表
const dirFormFields = [
    { name: "title", labelKey: "diolog.title", type: "text" },
    { name: "url", labelKey: "diolog.url", type: "text" }
]
const language = [
    {"title": "English", "key": "en"},
    {"title": "简体中文", "key": "zh"}
]
const lang = ref("en")
const isConnectionSettingDialogOpen = ref(false); // 设置面板
const connectionId = ref();

const playlistFormSchema = toTypedSchema(z.object({
    title: z.string().min(2),
    url: z.string()
}))

const { handleSubmit, setValues } = useForm({
    validationSchema: playlistFormSchema,
})

/**
 * 获取所有目录
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
 * 添加目录
 */ 
const addDir = () => {
    isAddDialogOpen.value = true;
}

/**
 * 保存新增目录
 */ 
const saveNewDir = handleSubmit((values) => {
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
            isAddDialogOpen.value = false;
            break
        }
        getPlaylist();
    })
})

/**
 * 编辑目录
 */ 
const editDir = (id: number) => {
    GetDir(id).then((res: Record<string, any>) => {
        if (res.status == 50000) {
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryDirError"),
            })
            return
        }
        dirDetail.value = res.data;
        setValues(res.data);
        isDialogOpen.value = true;
    })
}

/**
 * 保存更新目录
 */ 
const saveDirConfig = handleSubmit((values) => {
    UpdateDir(dirDetail.value!.id, JSON.stringify(values)).then((res: Record<string, any>) => {
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
            // 重新获取目录列表
            getPlaylist()
            // 关闭表单
            isDialogOpen.value = false
            break
        }
    })
})

/**
 * 重新同步歌曲列表
 */ 
const reSyncDir = (id: number) => {
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
 * 删除目录
 */ 
const deleteDir = (id: number) => {
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

/**
 * 设置语言
 */ 
const setUserLanguage = (lang: string) => {
  localStorage.setItem('user-lang', lang); // 存储到 localStorage
  i18n.global.locale = lang;
}

const connectionFormFields = [
    { name: "title", labelKey: "configPanel.title", type: "text" },
    { name: "protocol", labelKey: "configPanel.protocol", type: "text" },
    { name: "address", labelKey: "configPanel.address", type: "text" },
    { name: "username", labelKey: "configPanel.username", type: "text" },
    { name: "password", labelKey: "configPanel.password", type: "text" },
]

const ConnectionFormSchema = toTypedSchema(z.object({
    title: z.string().min(1),
    protocol: z.string().min(1),
    address: z.string(),
    username: z.string(),
    password: z.string()
}))

const GeneralSettingsForm = useForm({
    validationSchema: ConnectionFormSchema,
})

/**
 * 打开连接设置面板
 */ 
const openSettingPanel = () => {
    GetAllConnections().then((res: Record<string, any>) => {
        if (res.status == 50000) {
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryRecordError"),
            })
            return
        }

        if (!res.data) {
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.RecordNotFound"),
            })
            return
        }
        let connectionData = res.data[0];
        GeneralSettingsForm.setValues(connectionData);
        connectionId.value = connectionData.id;
    })

    isConnectionSettingDialogOpen.value = true;
}

/**
 * 更新连接配置
 */ 
const updateConnectionSetting = GeneralSettingsForm.handleSubmit((values) => {
    UpdateConnection(connectionId.value, JSON.stringify(values)).then((res: Record<string, any>) => {
        switch (res.status) {
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
        case 50000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.queryRecordError"),
            })
            break
        case 50001:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.updateRecordError"),
            })
            break
        case 20000:
            WindowReload();
        }
        
    })
})

watch(() => lang.value, (value) => {
    setUserLanguage(value)
})

onMounted(() => {
    getPlaylist()
    lang.value = localStorage.getItem('user-lang') || "en"
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
                    <Button variant="ghost" size="sm" class="w-full flex items-center justify-start p-2 hover:bg-red-500 hover:text-white">
                        <Music2 class="h-4 w-4 mr-2" /> <span>{{ t("menu.songs") }}</span>
                    </Button>
                </RouterLink>
            </div>

            <div class="flex item-center justify-between px-2 text-sm text-stone-500 font-medium mb-2">
                <span>{{ t("menu.playlists") }}</span>
                <span class="flex items-center cursor-pointer" @click="addDir"><CirclePlus class="h-4 w-4 text-red-500" /></span>
            </div>

            <Collapsible v-model:open="isOpen" class="w-full space-y-2">
                <CollapsibleTrigger as-child>
                    <Button variant="ghost" size="sm" class="w-full px-2 flex justify-between hover:bg-red-500 hover:text-white">
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
                            <RouterLink :to="`/main/songs?dir=${playlist.id}&pageName=${playlist.title}`" class="flex-1 ">
                                <div class="w-full text-sm text-stone-600">{{ playlist.title }}</div>
                            </RouterLink>
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <Ellipsis class="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem @click="reSyncDir(playlist.id)">
                                        <FolderSync class="mr-2 h-4 w-4" />
                                        {{ t("menu.sync") }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="editDir(playlist.id)">
                                        <Bolt class="mr-2 h-4 w-4" />
                                        {{ t("menu.edit") }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="deleteDir(playlist.id)">
                                        <Trash2 class="mr-2 h-4 w-4" />
                                        {{ t("menu.delete") }}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </ScrollArea>

        <!-- 底部 -->
        <div class="h-14 p-2 px-3">
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="sm" class="w-full flex items-center justify-start p-2 hover:bg-red-500 hover:text-white">
                        <Settings class="h-4 w-4 mr-2" /> <span>{{ t("menu.settings") }}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-40">
                    <DropdownMenuGroup>
                        <DropdownMenuItem>
                            <Server class="mr-2 h-4 w-4" />
                            <span @click="openSettingPanel">{{ t("menu.conSetting") }}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Languages class="mr-4 h-4 w-4" />
                                <span>{{ t("menu.langSetting") }}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuLabel>{{ t("menu.selectLang") }}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup v-model="lang">
                                        <DropdownMenuRadioItem :value="`${item.key}`" v-for="(item, index) in language">
                                        {{ item.title }}
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>

    <Toaster />

    <!-- 更新表单 -->
    <Dialog v-model:open="isDialogOpen">
        <DialogContent class="sm:max-w-[420px]">
            <DialogHeader>
                <DialogTitle>{{ t("diolog.editPlaylists") }}</DialogTitle>
            </DialogHeader>
            <form id="dialogEditForm" @submit="saveDirConfig">
                <template v-for="(field, index) in dirFormFields" :key="index">
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

    <!-- 新增表单 -->
    <Dialog v-model:open="isAddDialogOpen">
        <DialogContent class="sm:max-w-[420px]">
            <DialogHeader>
                <DialogTitle>{{ t("diolog.addPlaylists") }}</DialogTitle>
            </DialogHeader>
            <form id="dialogAddForm" @submit="saveNewDir">
                <template v-for="(field, index) in dirFormFields" :key="index">
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

    <!-- 连接设置 -->
    <Dialog v-model:open="isConnectionSettingDialogOpen">
        <DialogContent class="w-[350px]">
            <DialogHeader>
                <DialogTitle>{{ t("configPanel.editConn") }}</DialogTitle>
            </DialogHeader>

            <form id="connectionForm" @submit="updateConnectionSetting" class="space-y-2">
                <template v-for="(field, index) in connectionFormFields" :key="index">
                    <FormField v-slot="{ componentField }" name="protocol" v-if="field.name == 'protocol'">
                        <FormItem>
                            <FormLabel>{{ t("configPanel.protocol") }}</FormLabel>
                            <Select v-bind="componentField">
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue :placeholder='`${ t("configPanel.pleaseChooseProtocol") }`' />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="WebDAV">WebDAV</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="field.name" v-else>
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