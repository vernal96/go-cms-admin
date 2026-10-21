import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [
        'vue',
        '@go-cms/admin/sdk',
        '@element-plus/icons-vue',
        'element-plus',
      ],
    },
  },
  test: {
    environment: 'jsdom',
  },
})
