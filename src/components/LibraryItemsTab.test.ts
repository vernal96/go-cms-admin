// @vitest-environment jsdom

import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { adminRequest } from '../api/admin-api'
import LibraryItemsTab from './LibraryItemsTab.vue'

const pushMock = vi.fn()
vi.mock('../api/admin-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/admin-api')>()),
  adminRequest: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: pushMock }) }))

const requestMock = vi.mocked(adminRequest)

describe('LibraryItemsTab', () => {
  beforeEach(() => {
    requestMock.mockReset()
    pushMock.mockReset()
  })

  it('loads a bounded Library-only page and navigates with a cursor', async () => {
    requestMock
      .mockResolvedValueOnce({
        items: [{ id: 101, title: 'First', slug: 'first', is_public: true, deleted: false }],
        next_cursor: 'next-page',
      })
      .mockResolvedValueOnce({ items: [], next_cursor: '' })
    const wrapper = shallowMount(LibraryItemsTab, {
      props: { accessToken: 'token', siteId: 7, libraryId: 9 },
      global: {
        renderStubDefaultSlot: true,
        stubs: { ElTableColumn: { template: '<div />' } },
        directives: { loading: () => undefined },
      },
    })
    await flushPromises()

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/sites/7/resources/9/items?limit=25',
      'token',
    )
    expect(wrapper.findComponent({ name: 'ElTable' }).props('data')).toEqual([
      expect.objectContaining({ id: 101, title: 'First' }),
    ])

    const buttons = wrapper.findAllComponents({ name: 'ElButton' })
    await buttons[0]?.trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/admin/sites/7/resources/9/items/new')
    await buttons[buttons.length - 1]?.trigger('click')
    await flushPromises()
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/sites/7/resources/9/items?limit=25&cursor=next-page',
      'token',
    )
  })
})

it('shows mirror resources read-only and paginates through the mirror API', async () => {
  const request = vi.mocked(adminRequest)
  request.mockResolvedValue({ items: [{ id: 10, title: 'Resource', slug: 'resource', is_public: true, effective_url: '/mirror/resource' }], next_cursor: 'opaque-next' } as never)
  const wrapper = mount(LibraryItemsTab, { props: { siteId: 7, libraryId: 20, accessToken: 'token', readonly: true }, global: { directives: { loading: () => {} } } })
  await flushPromises()
  expect(wrapper.text()).toContain('только для чтения')
  expect(wrapper.text()).toContain('/mirror/resource')
  expect(wrapper.text()).not.toContain('Добавить ресурс')
  expect(wrapper.text()).not.toContain('Редактировать')
  await wrapper.findAll('button').find(button => button.text() === 'Далее')!.trigger('click')
  await flushPromises()
  expect(request).toHaveBeenLastCalledWith('/api/sites/7/resources/20/items?limit=25&cursor=opaque-next', 'token')
  wrapper.unmount()
})
