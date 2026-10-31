import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// base './' makes every asset path relative, so the same build works
// at https://quangthong3005-ai.github.io/dynamiteband/ today
// and at your own domain (for example https://dynamiteband.com) later.
//
// Multi-page site: every HTML file listed here becomes its own page.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        videos: fileURLToPath(new URL('./videos.html', import.meta.url)),
        booking: fileURLToPath(new URL('./booking.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
})
