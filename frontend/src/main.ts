import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import '@/assets/index.css'
import router from '@/router/index'
import i18n from '@/i18n'

createApp(App)
.use(router)
.use(i18n)
.use(createPinia())
.mount('#app')
