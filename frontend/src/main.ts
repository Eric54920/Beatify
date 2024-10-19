import { createApp } from 'vue'
import App from '@/App.vue'
import '@/assets/index.css'
import router from '@/router/index'
import i18n from '@/i18n'
import { FontAwesomeIcon } from './icons'

createApp(App)
.use(router)
.use(i18n)
.component('font-awesome-icon', FontAwesomeIcon)
.mount('#app')
