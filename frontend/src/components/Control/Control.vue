<script lang="ts" setup>
</script>

<template>
    <div class="flex h-full p-1">
        <div class="w-60 flex justify-center items-center">
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-md" icon="shuffle" /></button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-2xl" icon="backward" /></button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-2xl" icon="pause" /></button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-2xl" icon="play" /></button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-2xl" icon="forward" /></button>
            <button class="w-10 h-10 flex justify-center items-center"><font-awesome-icon class="text-stone-500 text-md" icon="repeat" /></button>
        </div>
        <div class="flex-1 flex border box-border">
            <div class="h-full aspect-square overflow-hidden">
                <img class="h-full" src="@/assets/images/default_pic.png">
            </div>
            <div class="flex flex-1 flex-col">
                <div class="h-full flex flex-1 flex-col justify-center overflow-hidden px-2 text-center">
                    <p class="text-sm text-nowrap text-stone-800">这就是爱</p>
                    <span class="text-xs text-nowrap text-stone-500">张杰</span>
                </div>
                <div class="h-1 w-full bg-stone-300">
                    <div class="h-full bg-stone-900" style="width: 30%"></div>
                </div>
            </div>
        </div>
        <div class="w-80 flex">
            <div class="flex-1 flex justify-center items-center">
                <button class="w-10 h-10"><font-awesome-icon class="text-stone-500 text-md" icon="volume-low" /></button>
                <div class="flex-1 h-1 bg-stone-300">
                    <div class="h-full bg-stone-900" style="width: 30%"></div>
                </div>
                <button class="w-10 h-10"><font-awesome-icon class="text-stone-500 text-md" icon="volume-high" /></button>
            </div>
            <div class="w-10  flex justify-center items-center">
                <button class="w-10 h-10"><font-awesome-icon class="text-stone-500 text-md" icon="list-ul" /></button>
            </div>
        </div>
    </div>
</template>