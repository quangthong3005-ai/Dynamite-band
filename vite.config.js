import { defineConfig } from 'vite'

// base './' makes every asset path relative, so the same build works
// at https://quangthong3005-ai.github.io/dynamiteband/ today
// and at your own domain (for example https://dynamiteband.com) later.
export default defineConfig({
  base: './',
})
