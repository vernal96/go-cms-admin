import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.ADMIN_PORT || 5173)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('ADMIN_PORT must be an integer between 1 and 65535')
  }
  return {
    plugins: [vue()],
    resolve: { alias: [{ find: /^@go-cms\/admin\/sdk$/, replacement: fileURLToPath(new URL('./src/sdk.ts', import.meta.url)) }], dedupe: ['vue', 'vue-router', 'element-plus'] },
    test: {
      setupFiles: ['./src/test/setup.ts'],
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.ADMIN_API_TARGET || 'http://localhost:8080',
          changeOrigin: false,
        },
      },
    },
  }
})
