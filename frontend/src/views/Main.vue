<script lang="ts">
import { defineComponent } from 'vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'

export default defineComponent({
    components: {
        Sidebar
    },
    data () {
        return {
            
        }
    }
})
</script>

<template>
    <div class="grid grid-cols-5 h-screen">
        <Sidebar/>
        <div class="col-span-4 border-l">
            <RouterView/>
        </div>
    </div>
</template>