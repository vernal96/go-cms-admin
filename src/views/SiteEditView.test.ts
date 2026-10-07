// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, expect, it, vi } from 'vitest'

import { adminRequest } from '../api/admin-api'
import { useSelectedSite } from '../composables/use-selected-site'
import SiteEditView from './SiteEditView.vue'

vi.mock('../api/admin-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/admin-api')>()
  return { ...original, adminRequest: vi.fn() }
})

const request = vi.mocked(adminRequest)

beforeEach(() => {
  request.mockReset()
  localStorage.clear()
  useSelectedSite().reset()
  useSelectedSite().setSelected({ id: 7, name: 'Старое название', domain: 'example.test' })
})

it('loads the name and refreshes the selected site after editing', async () => {
  const current = { id: 7, name: 'Старое название', domain: 'example.test', profile_code: 'dev', locale: 'ru-RU', settings: {}, is_public: true }
  const updated = { ...current, name: 'Новое название' }
  request.mockResolvedValueOnce({ site: current, permissions: {} }).mockResolvedValueOnce({ site: updated, permissions: {} })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/sites/:siteId/edit', component: SiteEditView }],
  })
  await router.push('/admin/sites/7/edit')
  await router.isReady()
  const wrapper = shallowMount(SiteEditView, {
    props: { accessToken: 'token', permissions: new Set(['core.site.update']) },
    global: { plugins: [router] },
  })
  await flushPromises()
  const form = wrapper.getComponent({ name: 'SiteForm' })
  expect(form.props('initial')).toMatchObject({ name: 'Старое название' })
  form.vm.$emit('submit', { name: 'Новое название', domain: 'example.test', profile_code: 'dev', locale: 'ru-RU', settings: {}, is_public: true })
  await flushPromises()
  expect(useSelectedSite().selectedSite.value).toEqual({ id: 7, name: 'Новое название', domain: 'example.test' })
  expect(localStorage.getItem('go-cms.admin.selected-site')).toContain('Новое название')
})
