<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { connectionFormFields } from "@/constants/fields"
import { ConnectionFormSchema } from "@/schema/schema"
import { IsExistConnection, AddConnection } from 'wailsjs/go/beatify/App'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel
} from '@/components/ui/form'

import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'

let hasConfig = ref<boolean>(false)
const { t } = useI18n()
const router = useRouter()
const connFrom = useForm({
    validationSchema: ConnectionFormSchema,
})

const addConnection = connFrom.handleSubmit((values) => {
    /* 添加配置 */
    AddConnection(JSON.stringify(values)).then((res: Record<string, any>) => {
        switch (res.status) {
        case 40000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.invalidForm"),
            })
        case 40001:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.notSupportedMultiConf"),
            })
        case 50000:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.checkConnectionError"),
            })
        case 50001:
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.createConfError"),
            })
        case 20000:
            router.push("/main")
        }
    })
})

const checkConfig = () => {
    /* 检查配置 */
    IsExistConnection().then((res: Record<string, any>) => {
        if (res.ststus == 50000) {
            toast({
                title: t("notification.errorTitle"),
                description: t("notification.checkConnectionError"),
            })
        } else {
            if (!res.data) {
                hasConfig.value = true
            } else {
                // 跳转到Home
                router.push("/main")
            }
        }
    })
}

onMounted(() => {
    checkConfig()
})
</script>

<template>
    <div class="flex justify-center items-center h-screen">
        <Toaster />

        <Card class="w-[350px]" v-if="hasConfig">
            <CardHeader>
                <CardTitle>{{ t("configPanel.panelName") }}</CardTitle>
                <CardDescription>{{ t("configPanel.panelDesc") }}</CardDescription>
            </CardHeader>
            <CardContent>
                <form id="addConnectionForm" @submit="addConnection">
                    <temppate v-for="(field, index) in connectionFormFields" :key="index">
                        <FormField v-slot="{ componentField }" name="protocol" v-if="field.name == 'protocol'">
                            <FormItem class="mb-1.5">
                                <FormLabel>{{ t(field.labelKey) }}</FormLabel>
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
                            <FormItem v-auto-animate class="mb-1.5">
                                <FormLabel>{{ t(field.labelKey) }}</FormLabel>
                                <FormControl>
                                    <Input :type="field.type" v-bind="componentField" />
                                </FormControl>
                            </FormItem>
                        </FormField>
                    </temppate>
                    <Button type="submit" class="w-full mt-6">{{ t("configPanel.add") }}</Button>
                </form>
            </CardContent>
        </Card>
    </div>
</template>

<style scoped></style>