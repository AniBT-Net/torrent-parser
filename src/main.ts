import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from '@/App.vue'
import '@/asserts/main.css'
import { initTheme } from '@/composables/useTheme'

initTheme()

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
