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
      external: ['vue', 'element-plus', '@element-plus/icons-vue', '@go-cms/admin/sdk'],
      output: { assetFileNames: 'style.css' },
    },
  },
  test: { environment: 'jsdom' },
})
