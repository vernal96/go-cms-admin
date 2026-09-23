// @vitest-environment jsdom
import { describe,expect,it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAdminApp } from './app'
import { adminPluginRegistryKey } from './admin-plugins/context'

describe('external app composition',()=>{
 it('creates isolated routers and exposes project routes and editors',()=>{
  const component={template:'<div />'}
  const app=createAdminApp({history:createMemoryHistory(),plugins:[{code:'project',routes:[{name:'project.page',path:'/admin/project',component}],fieldEditors:{'project.value':component}}]})
  const other=createAdminApp({history:createMemoryHistory()})
  expect(app.config.globalProperties.$router.hasRoute('project.page')).toBe(true)
  expect(other.config.globalProperties.$router.hasRoute('project.page')).toBe(false)
  expect(app._context.provides[adminPluginRegistryKey as symbol].fieldEditor('project.value')).toBe(component)
 })
})
