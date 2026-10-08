// @vitest-environment jsdom

import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { FieldDefinition } from '../../types/admin'
import FilterBuilderField from './FilterBuilderField.vue'
import SortBuilderField from './SortBuilderField.vue'

const choices = [
  { value: 'resource.title', label: 'Заголовок' },
  { value: 'resource.field.rank', label: 'Статья: Рейтинг' },
]
const field: FieldDefinition = { key: 'filters', type: 'json', editor: 'filter-builder', label: 'Фильтры', required: false, validators: [], options: { choices } }

describe('resource list semantic editors', () => {
  it('adds typed filter conditions using metadata field choices and emits backend-shaped values', async () => {
    const wrapper = shallowMount(FilterBuilderField, { props: { field, modelValue: [] } })
    await wrapper.findComponent({ name: 'ElButton' }).vm.$emit('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[{ field: 'resource.title', operator: 'eq', value: '' }]])
  })

  it('retains and edits filter value_kind for custom fields', async () => {
    const wrapper = shallowMount(FilterBuilderField, {
      props: { field, modelValue: [{ field: 'resource.field.rank', operator: 'gte', value: 4, value_kind: 'integer' }] },
    })
    await wrapper.findAllComponents({ name: 'ElSelect' }).at(-1)?.vm.$emit('update:modelValue', 'float')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[
      { field: 'resource.field.rank', operator: 'gte', value: 4, value_kind: 'float' },
    ]])
  })

  it('adds and edits sorting with backend field and direction names', async () => {
    const sortField = { ...field, key: 'sorting', editor: 'sort-builder' }
    const wrapper = shallowMount(SortBuilderField, { props: { field: sortField, modelValue: [] } })
    await wrapper.findComponent({ name: 'ElButton' }).vm.$emit('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[{ field: 'resource.title', direction: 'asc' }]])
    await wrapper.setProps({ modelValue: [{ field: 'resource.field.rank', direction: 'asc', value_kind: 'integer' }] })
    await wrapper.findAllComponents({ name: 'ElSelect' }).at(1)?.vm.$emit('update:modelValue', 'desc')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[
      { field: 'resource.field.rank', direction: 'desc', value_kind: 'integer' },
    ]])
  })
})
