import type { AdminPlugin } from '@go-cms/admin/sdk'
import { Van } from '@element-plus/icons-vue'
import TaxiRecordsView from './TaxiRecordsView.vue'

const taxiAdminPlugin: AdminPlugin = {
  code: 'taxi',
  icons: { taxi: Van },
  routes: [
    {
      name: 'taxi.records',
      path: '/admin/taxi/records',
      component: TaxiRecordsView,
    },
  ],
}

export { TaxiRecordsView }
export default taxiAdminPlugin
