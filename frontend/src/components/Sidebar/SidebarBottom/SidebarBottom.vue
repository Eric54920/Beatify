<script setup lang=ts>
import { ref, onMounted, watch } from 'vue'
import { useForm } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import { language } from '@/i18n'
import { useSharedStore } from '@/stores/useShareStore'
import { ConnectionFormSchema } from "@/schema/schema"
import { WindowReload } from 'wailsjs/runtime/runtime'
import { GetAllConnections, UpdateConnection } from 'wailsjs/go/beatify/App'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button';
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
    Settings,
    Server,
    Languages
} from 'lucide-vue-next'

const { t } = useI18n()
const lang = ref("en")
const store = useSharedStore();
const isConnectionSettingDialogOpen = ref(false); // 设置面板
const connectionId = ref();
const connectionFormFields = [
    { name: "title", labelKey: "configPanel.title", type: "text" },
    { name: "protocol", labelKey: "configPanel.protocol", type: "text" },
    { name: "address", labelKey: "configPanel.address", type: "text" },
    { name: "username", labelKey: "configPanel.username", type: "text" },
    { name: "password", labelKey: "configPanel.password", type: "text" }
]
const ConnSettingsForm = useForm({
    validationSchema: ConnectionFormSchema,
})

/**
 * 打开连接设置面板
 */
const openConnSettingPanel = () => {
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
        ConnSettingsForm.setValues(connectionData);
        connectionId.value = connectionData.id;
    })

    isConnectionSettingDialogOpen.value = true;
}

/**
 * 更新连接配置
 */
const updateConnectionSetting = ConnSettingsForm.handleSubmit((values) => {
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
            break
        }
    })
})

/**
 * 获取语言设置
 */ 
const getLanguage = () => {
    lang.value = localStorage.getItem('user-lang') || "en"
}

watch(() => lang.value, (value) => {
    store.setLanguage(value);
    toast({
        title: t("notification.setLangSucc"),
        description: t("notification.setLangSuccDesc"),
    });
})

onMounted(() => {
    getLanguage();
})
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="sm"
                class="w-full flex items-center justify-start p-2 hover:bg-red-500 hover:text-white">
                <Settings class="h-4 w-4 mr-2" /> <span>{{ t("menu.settings") }}</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-40">
            <DropdownMenuGroup>
                <DropdownMenuItem>
                    <Server class="mr-2 h-4 w-4" />
                    <span @click="openConnSettingPanel">{{ t("menu.conSetting") }}</span>
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

    <Toaster />

    <!-- 更新连接设置 -->
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
                                        <SelectValue :placeholder='`${t("configPanel.pleaseChooseProtocol")}`' />
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