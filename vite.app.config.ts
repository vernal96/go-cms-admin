import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import manifest from './package.json'

const shared = Object.keys(manifest.peerDependencies)

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist-app',
    lib: {
      entry: 'src/app.ts',
      formats: ['es'],
      fileName: 'app',
      cssFileName: 'app',
    },
    rollupOptions: {
      external: id => shared.some(name => id === name || id.startsWith(`${name}/`)),
    },
  },
})
