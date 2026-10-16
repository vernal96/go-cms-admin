// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

import { AdminAPIError, adminRequest } from '../api/admin-api'
import SiteCreateView from './SiteCreateView.vue'

const pushMock = vi.hoisted(() => vi.fn())

vi.mock('../api/admin-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/admin-api')>()
  return { ...original, adminRequest: vi.fn() }
})
vi.mock('vue-router', () => ({ useRouter: () => ({ push: pushMock }) }))

const request = vi.mocked(adminRequest)

beforeEach(() => {
  request.mockReset()
  pushMock.mockReset()
})

it('shows a domain-specific message when site creation returns 409', async () => {
  request.mockRejectedValueOnce(new AdminAPIError(409, 'conflict', 'object conflicts with existing data'))
  const wrapper = shallowMount(SiteCreateView, {
    props: { accessToken: 'token', permissions: new Set(['core.site.create']) },
  })

  const form = wrapper.getComponent({ name: 'SiteForm' })
  form.vm.$emit('submit', {
    name: 'New site',
    domain: 'localhost',
    profile_code: 'dev',
    locale: 'ru-RU',
    is_public: false,
  })
  await flushPromises()

  expect(request).toHaveBeenCalledWith('/api/sites', 'token', expect.objectContaining({ method: 'POST' }))
  expect(form.props('domainError')).toBe('Домен уже используется')
  expect(form.props('error')).toBeNull()
  wrapper.unmount()
})
