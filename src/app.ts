import { createApp, type App as VueApp, type Component, type ComponentPublicInstance, type Plugin } from 'vue'
import { ElLoading } from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@fortawesome/fontawesome-free/css/fontawesome.css'
import '@fortawesome/fontawesome-free/css/solid.css'

import { projectName } from './project'
import { adminPlugins } from './admin-plugins'
import { AdminPluginRegistry } from './admin-plugins/registry'
import type { AdminPlugin, AdminOverrides } from './admin-plugins/plugin'
import type { RouterHistory } from 'vue-router'
import { shellRoutes } from './shell-routes'
import { adminPluginRegistryKey } from './admin-plugins/context'
import App from './App.vue'
import { createAdminRouter } from './router'
import './styles.css'

export type AdminMountTarget = string | Element

export interface AdminAppOptions {
  plugins?: readonly AdminPlugin[]
  overrides?: AdminOverrides
  history?: RouterHistory
}
export interface AdminMountOptions extends AdminAppOptions {
  target?: AdminMountTarget
}

export function createAdminApp(options: AdminAppOptions = {}): VueApp<Element> {
  const registry = new AdminPluginRegistry([...adminPlugins, ...(options.plugins ?? [])], Object.values(shellRoutes), options.overrides)
  const router = createAdminRouter(registry, options.history)
  document.title = `${projectName} — Администрирование`
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    `Панель управления сайтом ${projectName}`,
  )

  return createApp(App)
    .provide(adminPluginRegistryKey, registry)
    .use(router)
    .use(ElLoading)
}

export function mountAdmin(options: AdminMountOptions = {}): ComponentPublicInstance | null {
  const target = options.target ?? '#app'
  return createAdminApp(options).mount(target)
}

export { App as AdminApp }
export type { Component, Plugin }

export type { AdminPlugin, AdminOverrides } from './admin-plugins/plugin'
