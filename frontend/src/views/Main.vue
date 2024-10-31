<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import Control from '@/components/Control/Control.vue'

const route = useRoute();
const pageName = ref<string>("Home");

watch(() => route.query, (query) => {
    pageName.value = Array.isArray(query.pageName)
      ? query.pageName[0] || "Home"
      : query.pageName || "Home";
  }
);
</script>

<template>
    <div class="flex h-screen">
        <!-- 左侧 -->
        <Sidebar class="min-w-52 bg-stone-200" />

        <!-- 右侧 -->
        <div class="flex-1 flex flex-col bg-white border-l border-stone-300 h-screen">
            <!-- 上面 -->
            <div class="flex flex-col bg-white">
                <Control class="h-14 border-b" />

                <div class="flex-1 bg-white py-2 text-center font-semibold text-stone-700 items-center text-sm">
                    {{ pageName }}
                </div>
            </div>

            <!-- 下面 -->
            <RouterView />
        </div>
    </div>
</template>