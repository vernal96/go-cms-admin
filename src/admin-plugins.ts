import { coreAdminPlugin } from './admin-plugins/core'
import { formsAdminPlugin } from './admin-plugins/forms'
import { mailAdminPlugin } from './admin-plugins/mail'
import geoYandexAdminPlugin from '@go-cms/admin-geo-yandex'
import '@go-cms/admin-geo-yandex/style.css'
import { shellRoutes } from './shell-routes'
import { AdminPluginRegistry } from './admin-plugins/registry'

// Installed frontend admin packages have one declarative composition point.
export const adminPlugins = [coreAdminPlugin, mailAdminPlugin, formsAdminPlugin, geoYandexAdminPlugin] as const
export const adminPluginRegistry = new AdminPluginRegistry(adminPlugins, Object.values(shellRoutes))
