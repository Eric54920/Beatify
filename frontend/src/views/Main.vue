<script lang="ts" setup>
import { defineComponent, ref } from 'vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'

const pageName = ref("Home")
</script>

<template>
    <div class="flex flex-col h-screen">
        <!-- 上面 -->
        <div class="flex-1 flex overflow-hidden">
            <!-- 左侧 -->
            <Sidebar />

            <!-- 右侧 -->
            <div class="flex-1 flex-col overflow-y-auto bg-white border-l">
                <div class="bg-white bg-opacity-50 backdrop-blur-lg sticky top-0 py-2 text-center font-semibold text-gray-700 leading-10 text-xl z-10">
                    {{ pageName }}
                </div>
                <div class="overflow-hidden">
                    <RouterView />
                </div>
            </div>
        </div>

        <!-- 下面 -->
        <div class="h-24 sticky inset-x-0 bottom-0 border-t bg-slate-600">
            footer
        </div>
    </div>
</template>