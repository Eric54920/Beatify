<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { GetAllDirs, DeleteDir, UpdateDir, CreateDir, ReSyncDir } from '../../../wailsjs/go/beatify/App'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import {
  LayoutGrid,
  Music2,
  MicVocal,
  Library,
  ListMusic,
  CirclePlus,
  Trash2,
  Bolt,
  FolderSync
} from 'lucide-vue-next'

interface Playlist {
  id: number,
  title: string,
  url: string
}
const { t } = useI18n()
const playlists = ref<Playlist[]>([])
const isDialogOpen = ref(false) // 更新表单
const isAddDialogOpen = ref(false) // 新增表单
// const playlistFormSchema = toTypedSchema(z.object({
//   title: z.string({ required_error: "title is required" }).min(2),
//   url: z.string({ required_error: "url is required" })
// }))

// const { handleSubmit } = useForm({
//   validationSchema: playlistFormSchema,
// })
const dirForm = ref({
  id: 0,
  title: "",
  url: ""
})

const saveDir = () => {
  /* 保存目录 */
  let id = dirForm.value.id
  let title = dirForm.value.title
  let url = dirForm.value.url
  if (title && url) {
    let formData = {
      "title": title,
      "url": url
    }
    UpdateDir(id, JSON.stringify(formData)).then((res: Record<string, any>) => {
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
            description: t("notification.ParameterException"),
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
  }
}

const getPlaylist = () => {
  /* 获取所有目录 */
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

const reSyncDir = (id: number) => {
  /* 重新同步歌曲列表 */
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
      case 20000:
        toast({
          title: t("notification.successTitle"),
          description: t("notification.syncSuccess"),
        })
        break
    }
  })
}

const editDir = (id: number) => {
  /* 编辑目录 */
  isDialogOpen.value = true;
  dirForm.value.id = id;
  // 找到要更新的数据
  playlists.value.forEach((playlist: Playlist) => {
    if (playlist.id == id) {
      dirForm.value.title = playlist.title;
      dirForm.value.url = playlist.url;
    }
  });
}

const deleteDir = (id: number) => {
  /* 删除目录 */
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

const addDirForm = ref({
  title: "",
  url: ""
})

const addDir = () => {
  /* 添加目录 */
  addDirForm.value = {
    title: "",
    url: ""
  };
  isAddDialogOpen.value = true;
}

const saveNewDir = () => {
  /* 保存新增目录 */
  CreateDir(JSON.stringify(addDirForm.value)).then((res: Record<string, any>) => {
    switch (res.status) {
      case 50000:
        toast({
          title: t("notification.errorTitle"),
          description: t("notification.createDirError"),
        })
        break
      case 40001:
        toast({
          title: t("notification.errorTitle"),
          description: t("notification.ParameterException"),
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
  <div :class="cn('pb-12 w-52', $attrs.class ?? '')">
    <div class="space-y-4 py-4">
      <div class="px-3 py-2">
        <div class="relative w-full mb-2 items-center">
          <Input id="search" type="text" :placeholder='`${t("menu.search")}`' class="pl-10 bg-stone-300" />
          <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
            <Search class="size-6 text-muted-foreground" />
          </span>
        </div>
      </div>
      <div class="px-3 py-2">
        <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">
          {{ t("menu.discover") }}
        </h2>
        <div class="space-y-1">
          <Button variant="ghost" class="w-full justify-start hover:bg-red-500 hover:text-white">
            <LayoutGrid class="mr-2 h-4 w-4" />
            {{ t("menu.browse") }}
          </Button>
        </div>
      </div>
      <div class="px-3 py-2">
        <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">
          {{ t("menu.library") }}
        </h2>
        <div class="space-y-1">
          <RouterLink :to="`/main/songs?dir=0&pageName=${t('menu.songs')}`">
            <Button variant="ghost" class="w-full justify-start  hover:bg-red-500 hover:text-white">
              <Music2 class="mr-2 h-4 w-4" />
              {{ t("menu.songs") }}
            </Button>
          </RouterLink>
          <Button variant="ghost" class="w-full justify-start  hover:bg-red-500 hover:text-white">
            <MicVocal class="mr-2 h-4 w-4" />
            {{ t("menu.artists") }}
          </Button>
          <Button variant="ghost" class="w-full justify-start  hover:bg-red-500 hover:text-white">
            <Library class="mr-2 h-4 w-4" />
            {{ t("menu.albums") }}
          </Button>
        </div>
      </div>
      <div class="py-2">
        <h2 class="flex justify-between items-center relative px-7 text-lg font-semibold tracking-tight">
          <span>{{ t("menu.playlists") }}</span>
          <Button variant="link" class="p-0" @click="addDir">
            <CirclePlus />
          </Button>
        </h2>
        <ScrollArea class="h-[200px] px-1">
          <div class="space-y-1 p-2">
            <RouterLink v-for="(playlist, i) in playlists" :key="`${playlist}-${i}`"
              :to="`/main/songs?dir=${playlist.id}&pageName=${playlist.title}`">
              <ContextMenu>
                <ContextMenuTrigger>
                  <Button variant="ghost" class="w-full justify-start font-normal overflow-ellipsis overflow-hidden hover:bg-red-500 hover:text-white">
                    <ListMusic class="mr-2 h-4 w-4" />
                    {{ playlist.title }}
                  </Button>
                </ContextMenuTrigger>
                <ContextMenuContent class="w-40">
                  <ContextMenuItem inset @click="reSyncDir(playlist.id)" class="px-2">
                    <FolderSync class="mr-2 h-4 w-4" />
                    {{ t("menu.sync") }}
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="editDir(playlist.id)" class="px-2">
                    <Bolt class="mr-2 h-4 w-4" />
                    {{ t("menu.edit") }}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem inset @click="deleteDir(playlist.id)" class="px-2">
                    <Trash2 class="mr-2 h-4 w-4" />
                    {{ t("menu.delete") }}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </RouterLink>
          </div>
        </ScrollArea>
      </div>
    </div>
    <Toaster />

    <!-- 更新表单 -->
    <Form>
      <Dialog v-model:open="isDialogOpen">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{{ t("diolog.editPlaylists") }}</DialogTitle>
          </DialogHeader>

          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>{{ t("diolog.title") }}</FormLabel>
              <FormControl>
                <Input type="text" :placeholder='`${t("diolog.playlistName")}`' v-bind="componentField"
                  v-model="dirForm.title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="url">
            <FormItem>
              <FormLabel>{{ t("diolog.url") }}</FormLabel>
              <FormControl>
                <Input type="text" :placeholder='`${t("diolog.playlistUrl")}`' v-bind="componentField"
                  v-model="dirForm.url" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <DialogFooter>
            <Button @click="saveDir">
              {{ t("diolog.saveChanges") }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>

    <!-- 新增表单 -->
    <Form>
      <Dialog v-model:open="isAddDialogOpen">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{{ t("diolog.addPlaylists") }}</DialogTitle>
          </DialogHeader>

          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>{{ t("diolog.title") }}</FormLabel>
              <FormControl>
                <Input type="text" :placeholder='`${t("diolog.playlistName")}`' v-bind="componentField"
                  v-model="addDirForm.title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="url">
            <FormItem>
              <FormLabel>{{ t("diolog.url") }}</FormLabel>
              <FormControl>
                <Input type="text" :placeholder='`${t("diolog.playlistUrl")}`' v-bind="componentField"
                  v-model="addDirForm.url" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <DialogFooter>
            <Button @click="saveNewDir">
              {{ t("diolog.save") }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  </div>
</template>