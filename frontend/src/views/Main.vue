<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import Control from '@/components/Control/Control.vue'
import { useSharedStore } from '@/stores/useShareStore'

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
        <Sidebar class="min-w-52 bg-stone-200" />

        <!-- 右侧 -->
        <div class="flex-1 flex flex-col bg-white border-l border-stone-300 h-screen">
            <!-- 上面 -->
            <div class="flex flex-col bg-white">
                <Control class="h-14 border-b" />
            </div>

            <!-- 下面 -->
            <RouterView />
        </div>
    </div>
</template>