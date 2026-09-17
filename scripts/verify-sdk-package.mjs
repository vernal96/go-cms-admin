import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))

async function verify(value) {
  if (typeof value === 'string') {
    if (!value.startsWith('./dist-sdk/') && !value.startsWith('./dist-app/')) {
      throw new Error(`Package export must belong to dist-sdk or dist-app: ${value}`)
    }
    const path = new URL(value, root)
    const info = await stat(path)
    if (!info.isFile() || info.size === 0) {
      throw new Error(`Missing or empty SDK export: ${fileURLToPath(path)}`)
    }
    return
  }
  for (const target of Object.values(value)) await verify(target)
}

await verify(manifest.exports)
console.log('Admin app, SDK JavaScript, declarations and styles are ready for packaging')
