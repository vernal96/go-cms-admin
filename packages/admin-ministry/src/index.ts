import type { AdminPlugin } from '@go-cms/admin/sdk'
import { Link } from '@element-plus/icons-vue'
import MinistryPortalsView from './MinistryPortalsView.vue'

const ministryAdminPlugin: AdminPlugin = {
  code: 'ministry',
  icons: { 'ministry.portals': Link },
  routes: [
    {
      name: 'ministry.portals',
      path: '/admin/ministry/portals',
      component: MinistryPortalsView,
    },
  ],
}

export { MinistryPortalsView }
export default ministryAdminPlugin
