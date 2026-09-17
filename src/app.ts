import { createApp, type App as VueApp, type Component, type ComponentPublicInstance, type Plugin } from 'vue'
import { ElLoading } from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import { projectName } from './project'
import { adminPluginRegistry } from './admin-plugins'
import { adminPluginRegistryKey } from './admin-plugins/context'
import App from './App.vue'
import { router } from './router'
import './styles.css'

export type AdminMountTarget = string | Element

export interface AdminMountOptions {
  target?: AdminMountTarget
}

export function createAdminApp(): VueApp<Element> {
  document.title = `${projectName} — Администрирование`
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    `Панель управления сайтом ${projectName}`,
  )

  return createApp(App)
    .provide(adminPluginRegistryKey, adminPluginRegistry)
    .use(router)
    .use(ElLoading)
}

export function mountAdmin(options: AdminMountOptions = {}): ComponentPublicInstance | null {
  const target = options.target ?? '#app'
  return createAdminApp().mount(target)
}

export { App as AdminApp }
export type { Component, Plugin }
