<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { IsExistConnection, AddConnection } from '../../wailsjs/go/beatify/App'

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
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
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form'

import Toaster from '@/components/ui/toast/Toaster.vue'
import { toast } from '@/components/ui/toast'
import { useToast } from '@/components/ui/toast/use-toast'

let hasConfig = ref<boolean>(false)
const router = useRouter()

const formSchema = toTypedSchema(z.object({
    title: z.string({ required_error: "please type title." }),
    protocol: z.string({ required_error: "please select a connect type." }),
    address: z.string(),
    username: z.string(),
    password: z.string()
}))

const { handleSubmit } = useForm({
    validationSchema: formSchema,
})

function addConfig(values: Record<string, any>) {
    /* 添加配置 */
    AddConnection(JSON.stringify(values)).then((res: Record<string, any>) => {
        if (res.status != 200) {
            toast({
                title: "发生了一些异常",
                description: res.msg,
            })
        } else {
            toast({
                title: "Success",
                description: res.msg,
            })
            router.push("/main")
        }
    })
}

function checkConfig() {
    /* 检查配置 */
    IsExistConnection().then((res: Record<string, any>) => {
        if (res.ststus == 500) {
            toast({
                title: "发生了一些异常",
                description: res.msg,
            })
        } else {
            if (!res.data) {
                toast({
                    title: "Success",
                    description: res.msg,
                })
                hasConfig.value = true
            } else {
                // 跳转到Home
                router.push("/main")
            }
        }
    })
}

onMounted(() => {
const { toast } = useToast()

checkConfig()
})
</script>

<template>
    <div class="flex justify-center items-center h-screen">
        <Toaster />
        <Form :validation-schema="formSchema" @submit="addConfig" v-if="hasConfig">
            <Card class="w-[350px]">
                <CardHeader>
                    <CardTitle>You have no config</CardTitle>
                    <CardDescription>You can start listen music as soon as you add a config.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField v-slot="{ componentField }" name="title">
                        <FormItem v-auto-animate>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="My Music" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" name="protocol">
                        <FormItem>
                            <FormLabel>Protocol</FormLabel>

                            <Select v-bind="componentField">
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a connect type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="WebDAV">WebDAV</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" name="address">
                        <FormItem v-auto-animate>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="http://example.com/my/music" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" name="username">
                        <FormItem v-auto-animate>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="admin" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" name="password">
                        <FormItem v-auto-animate>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" v-bind="componentField" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </FormField>
                </CardContent>
                <CardFooter class="flex justify-between px-6 pb-6">
                    <Button type="submit" class="w-full">Add</Button>
                </CardFooter>
            </Card>
        </Form>
    </div>
</template>

<style scoped></style>