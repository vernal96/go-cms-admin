// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResourceReferenceField from './ResourceReferenceField.vue'

const { getMaterialOption, listMaterials } = vi.hoisted(() => ({ getMaterialOption: vi.fn(), listMaterials: vi.fn() }))
vi.mock('../../api/materials', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/materials')>(),
  getMaterialOption,
  listMaterials,
}))

describe('ResourceReferenceField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMaterials.mockResolvedValue({ items: [], page: 1, per_page: 100, has_more: true })
  })

  it('hydrates an existing library item by its ID while keeping paginated browsing bounded', async () => {
    getMaterialOption.mockResolvedValue({
      id: 37,
      storage_kind: 'library_item',
      title: 'Новость из библиотеки',
      template_code: 'news',
    })
    const wrapper = mount(ResourceReferenceField, {
      props: {
        modelValue: 37,
        siteId: 7,
        accessToken: 'session-token',
        templates: ['news'],
        storageKinds: ['tree', 'library_item'],
      },
    })

    await flushPromises()

    expect(getMaterialOption).toHaveBeenCalledWith('session-token', 7, 37)
    expect(listMaterials).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent({ name: 'ElOption' }).props('label')).toContain('Новость из библиотеки')
  })

  it('keeps a reference outside the current template restrictions unresolved', async () => {
    getMaterialOption.mockResolvedValue({
      id: 37,
      storage_kind: 'library_item',
      title: 'Документ',
      template_code: 'document',
    })
    const wrapper = mount(ResourceReferenceField, {
      props: {
        modelValue: 37,
        siteId: 7,
        accessToken: 'session-token',
        templates: ['news'],
        storageKinds: ['tree', 'library_item'],
      },
    })

    await flushPromises()

    expect(wrapper.findComponent({ name: 'ElOption' }).props('label')).toBe('Материал #37')
  })
})
