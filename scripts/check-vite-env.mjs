import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfigFromFile } from 'vite'

const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url))

test('Vite reads .env and gives process environment precedence', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cms-admin-env-'))
  const cwd = process.cwd()
  const original = { ADMIN_API_TARGET: process.env.ADMIN_API_TARGET, ADMIN_PORT: process.env.ADMIN_PORT }
  try {
    process.chdir(directory)
    delete process.env.ADMIN_API_TARGET
    delete process.env.ADMIN_PORT
    writeFileSync(join(directory, '.env'), 'ADMIN_API_TARGET=http://127.0.0.1:18080\nADMIN_PORT=15173\n')
    const fromFile = await loadConfigFromFile({ command: 'serve', mode: 'development' }, configFile)
    assert.equal(fromFile.config.server.proxy['/api'].target, 'http://127.0.0.1:18080')
    assert.equal(fromFile.config.server.port, 15173)

    process.env.ADMIN_API_TARGET = 'http://backend:8080'
    process.env.ADMIN_PORT = '5173'
    const fromProcess = await loadConfigFromFile({ command: 'serve', mode: 'development' }, configFile)
    assert.equal(fromProcess.config.server.proxy['/api'].target, 'http://backend:8080')
    assert.equal(fromProcess.config.server.port, 5173)
  } finally {
    process.chdir(cwd)
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    rmSync(directory, { recursive: true, force: true })
  }
})
