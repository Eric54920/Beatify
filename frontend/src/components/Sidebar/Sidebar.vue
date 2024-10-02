<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { GetAllDirs, DeleteDir, UpdateDir, CreateDir } from '../../../wailsjs/go/beatify/App'
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
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import { useToast } from '@/components/ui/toast/use-toast'

interface Playlist {
  id: number,
  title: string,
  url: string
}

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
      if (res.status == 500) {
        toast({
          title: "Error",
          description: "Update error",
        })
      } else if (res.status == 400) {
        toast({
          title: "Error",
          description: "Arguments Error",
        })
      } else if (res.status == 404) {
        toast({
          title: "Error",
          description: "Record not found",
        })
      } else {
        toast({
          title: "Success",
          description: "Update success",
        })
        // 重新获取目录列表
        getPlaylist()
        // 关闭表单
        isDialogOpen.value = false
      }
    })
  }
}

const getPlaylist = () => {
  /* 获取所有目录 */
  GetAllDirs().then((res: Record<string, any>) => {
    if (res.ststus == 500) {
      toast({
        title: "发生了一些异常",
        description: res.msg,
      })
    } else if (res.status == 404) {
      toast({
        title: "Success",
        description: res.msg,
      })
    } else {
      playlists.value = res.data
      toast({
        title: "Success",
        description: res.msg,
      })
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
    if (res.status == 200) {
      toast({
        title: "Success",
        description: res.msg,
      })
      getPlaylist()
    } else {
      toast({
        title: "发生了一些异常",
        description: res.msg,
      })
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
    if (res.status == 500) {
      toast({
        title: "发生了一些异常",
        description: res.msg,
      })
    } else {
      toast({
        title: "Success",
        description: res.msg,
      })
      isAddDialogOpen.value = false;
      getPlaylist()
    }
  })
}

onMounted(() => {
  const { toast } = useToast()

  getPlaylist()
})
</script>

<template>
  <div :class="cn('pb-12', $attrs.class ?? '')">
    <div class="space-y-4 py-4">
      <div class="px-3 py-2">
        <div class="relative w-full mb-2 items-center">
          <Input id="search" type="text" placeholder="Search..." class="pl-10" />
          <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
            <Search class="size-6 text-muted-foreground" />
          </span>
        </div>
      </div>
      <div class="px-3 py-2">
        <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">
          Discover
        </h2>
        <div class="space-y-1">
          <Button variant="ghost" class="w-full justify-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="mr-2 h-4 w-4">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            Browse
          </Button>
        </div>
      </div>
      <div class="px-3 py-2">
        <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">
          Library
        </h2>
        <div class="space-y-1">
          <Button variant="ghost" class="w-full justify-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="mr-2 h-4 w-4">
              <circle cx="8" cy="18" r="4" />
              <path d="M12 18V2l7 4" />
            </svg>
            Songs
          </Button>
          <Button variant="ghost" class="w-full justify-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="mr-2 h-4 w-4">
              <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
              <circle cx="17" cy="7" r="5" />
            </svg>
            Artists
          </Button>
          <Button variant="ghost" class="w-full justify-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="mr-2 h-4 w-4">
              <path d="m16 6 4 14" />
              <path d="M12 6v14" />
              <path d="M8 8v12" />
              <path d="M4 4v16" />
            </svg>
            Albums
          </Button>
        </div>
      </div>
      <div class="py-2">
        <h2 class="flex justify-between items-center relative px-7 text-lg font-semibold tracking-tight">
          <span>Playlists</span>
          <Button variant="link" class="p-0" @click="addDir">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
              stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </Button>
        </h2>
        <ScrollArea class="h-[200px] px-1">
          <div class="space-y-1 p-2">
            <RouterLink v-for="(playlist, i) in playlists" :key="`${playlist}-${i}`" :to="`/songs?url=${playlist.url}`">
              <ContextMenu>
                <ContextMenuTrigger>
                  <Button variant="ghost" class="w-full justify-start font-normal overflow-ellipsis overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="mr-2 h-4 w-4">
                      <path d="M21 15V6" />
                      <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path d="M12 12H3" />
                      <path d="M16 6H3" />
                      <path d="M12 18H3" />
                    </svg>
                    {{ playlist.title }}
                  </Button>
                </ContextMenuTrigger>
                <ContextMenuContent class="w-40">
                  <ContextMenuItem inset @click="editDir(playlist.id)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                      stroke="currentColor" class="mr-2 h-4 w-4">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    编辑
                  </ContextMenuItem>
                  <ContextMenuItem inset @click="deleteDir(playlist.id)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                      stroke="currentColor" class="mr-2 h-4 w-4">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    删除
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
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>

          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input type="text" placeholder="playlist name" v-bind="componentField" v-model="dirForm.title" />
              </FormControl>
              <FormDescription>
                This is the playlist name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="url">
            <FormItem>
              <FormLabel>Url</FormLabel>
              <FormControl>
                <Input type="text" placeholder="playlist url" v-bind="componentField" v-model="dirForm.url" />
              </FormControl>
              <FormDescription>
                This is the playlist url.
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <DialogFooter>
            <Button @click="saveDir">
              Save changes
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
            <DialogTitle>Add Playlist</DialogTitle>
          </DialogHeader>

          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input type="text" placeholder="playlist name" v-bind="componentField" v-model="addDirForm.title" />
              </FormControl>
              <FormDescription>
                This is the playlist name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="url">
            <FormItem>
              <FormLabel>Url</FormLabel>
              <FormControl>
                <Input type="text" placeholder="playlist url" v-bind="componentField" v-model="addDirForm.url" />
              </FormControl>
              <FormDescription>
                This is the playlist url.
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <DialogFooter>
            <Button @click="saveNewDir">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  </div>
</template>