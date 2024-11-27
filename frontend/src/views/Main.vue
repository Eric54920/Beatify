<script lang="ts" setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSharedStore } from '@/stores/useShareStore'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import Control from '@/components/Control/Control.vue'
import NextAndHistory from '@/components/NextAndHistory/NextAndHistory.vue'

const store = useSharedStore()
const route = useRoute();

watch(() => route.query, (query) => {
    let pageName = Array.isArray(query.pageName)
      ? query.pageName[0] || "Home"
      : query.pageName || "Home";

    store.setPageName(pageName);
  }
);
</script>

<template>
    <div class="flex h-screen">
        <!-- 左侧 -->
        <Sidebar class="min-w-52 bg-neutral-200" />

        <!-- 右侧 -->
        <div class="flex-1 flex flex-col bg-white border-l border-stone-300 h-screen">
            <!-- 上面 -->
            <div class="flex h-14 flex-col bg-white border-b z-10">
                <Control class="h-14" />
            </div>

            <!-- 下面 -->
            <RouterView />

            <!-- 待播和历史列表 -->
            <NextAndHistory />
        </div>
    </div>
</template>