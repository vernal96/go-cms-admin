import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'

import type { AdminPluginRegistry } from './admin-plugins/registry'
import { shellRoutes } from './shell-routes'
import DashboardView from './views/DashboardView.vue'
import ProfileView from './views/ProfileView.vue'

export function createAdminRouter(registry: AdminPluginRegistry, history: RouterHistory = createWebHistory()) {
 return createRouter({
  history,
  routes: [
    { path: '/', redirect: '/admin/dashboard' },
    { ...shellRoutes.root, redirect: shellRoutes.dashboard.path },
    { ...shellRoutes.dashboard, component: DashboardView },
    { ...shellRoutes.profile, component: ProfileView },
    ...registry.routeRecords(),
    { path: '/:pathMatch(.*)*', redirect: '/admin/dashboard' },
  ],
})

}
