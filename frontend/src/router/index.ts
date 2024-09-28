import { createMemoryHistory, createRouter } from 'vue-router'

import Welcome from '@/views/Welcome.vue'
import Main from '@/views/Main.vue'

const routes = [
  { path: '/', component: Welcome, name: "welcome" },
  { path: '/main', component: Main, name: "main" },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router