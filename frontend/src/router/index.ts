import { createMemoryHistory, createRouter } from 'vue-router'

import Welcome from '@/views/Welcome.vue'
import Main from '@/views/Main.vue'
import Songs from '@/views/Songs.vue'

const routes = [
  { path: '/', component: Welcome, name: "welcome" },
  { 
    path: '/main', 
    component: Main, 
    name: "main",
    children: [
      { path: 'songs', component: Songs, name: "songs" },
    ]
  },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router