// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminRequest } from '../api/admin-api'
import UserFormView from './UserFormView.vue'

vi.mock('../api/admin-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/admin-api')>()
  return { ...original, adminRequest: vi.fn() }
})

const requestMock = vi.mocked(adminRequest)

const externalOnlyUser = {
  id: 42,
  login: 'external.user',
  email: '',
  name: 'External',
  last_name: null,
  middle_name: null,
  phone: null,
  last_login_at: null,
  created_at: '2026-10-20T00:00:00Z',
  updated_at: '2026-10-20T00:00:00Z',
  blocked: false,
  blocked_at: null,
  capabilities: { update: true, change_password: true, edit_groups: false, block: false, unblock: false },
}

function createRouterAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/users/:userId/edit', component: UserFormView },
      { path: '/admin/users/create', component: UserFormView },
      { path: '/admin/users', component: { template: '<div />' } },
    ],
  })
  return router.push(path).then(() => router.isReady()).then(() => router)
}

describe('UserFormView', () => {
  beforeEach(() => {
    requestMock.mockResolvedValue({ user: externalOnlyUser })
  })

  afterEach(() => vi.clearAllMocks())

  it('allows saving an external-only user with an empty email', async () => {
    const router = await createRouterAt('/admin/users/42/edit')
    const wrapper = mount(UserFormView, {
      props: {
        accessToken: 'token',
        permissions: new Set(['core.user.read', 'core.user.update']),
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const fields = wrapper.findAll('.form-grid input')
    await fields[2].setValue('Updated name')
    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Сохранить информацию'))
    expect(saveButton).toBeDefined()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(requestMock).toHaveBeenCalledWith('/api/admin/users/42', 'token', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        login: 'external.user',
        email: '',
        name: 'Updated name',
        last_name: null,
        middle_name: null,
        phone: null,
      }),
    }))
  })

  it('keeps email required when creating a password-based user', async () => {
    const router = await createRouterAt('/admin/users/create')
    const wrapper = mount(UserFormView, {
      props: {
        accessToken: 'token',
        permissions: new Set(['core.user.create']),
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.findAll('.form-grid input')[1].attributes('type')).toBe('email')
    expect(wrapper.findAll('.el-form-item')[1].classes()).toContain('is-required')
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('Создать пользователя'))
    expect(createButton).toBeDefined()
    await createButton!.trigger('click')
    await flushPromises()

    expect(requestMock).not.toHaveBeenCalled()
  })
})
