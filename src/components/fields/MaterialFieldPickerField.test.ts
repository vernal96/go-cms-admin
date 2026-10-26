// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DynamicField from './DynamicField.vue'
import type { FieldDefinition } from '../../types/admin'

const { getMaterialFields } = vi.hoisted(() => ({ getMaterialFields: vi.fn() }))
vi.mock('../../api/materials', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/materials')>(),
  getMaterialFields,
}))

const field: FieldDefinition = {
  key: 'fields',
  type: 'string',
  editor: 'material-field-picker',
  label: 'Поля ресурса',
  required: true,
  validators: [],
  options: { multiple: true },
}

describe('material-field-picker editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMaterialFields.mockResolvedValue({ items: [
      { value: 'title', label: 'Заголовок' },
      { value: 'url', label: 'Ссылка' },
      { value: 'image', label: 'Изображение' },
      { value: 'publish_at', label: 'Дата публикации' },
    ] })
  })

  it('dispatches backend editor metadata and lets the editor select fields for its material', async () => {
    const wrapper = mount(DynamicField, {
      props: {
        field,
        modelValue: [],
        values: { resource: 42 },
        siteId: 7,
        accessToken: 'session-token',
      },
    })

    await flushPromises()

    expect(wrapper.findComponent({ name: 'MaterialFieldPickerField' }).exists()).toBe(true)
    expect(getMaterialFields).toHaveBeenCalledWith('session-token', 7, 42)
    expect(wrapper.text()).toContain('Заголовок')
    expect(wrapper.text()).toContain('Дата публикации')

    const title = wrapper.findAllComponents({ name: 'ElCheckbox' }).find((checkbox) => checkbox.props('value') === 'title')
    expect(title).toBeDefined()
    await title!.find('input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['title'])
  })
})
