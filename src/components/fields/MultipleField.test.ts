// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { ElFormItem } from 'element-plus'
import { describe, expect, it } from 'vitest'
import type { FieldDefinition } from '../../types/admin'
import { AdminPluginRegistry } from '../../admin-plugins/registry'
import { adminPluginRegistryKey } from '../../admin-plugins/context'
import DynamicField from './DynamicField.vue'
import { createFieldValues, validateFieldValues } from './model'

const field: FieldDefinition = { key: 'items', type: 'string', label: 'Items', required: false, validators: [{ type: 'min_items', options: { value: 1 } }, { type: 'max_items', options: { value: 3 } }], options: { multiple: true } }
describe('multiple standard fields', () => {
  it('adds, edits, reorders and removes values while retaining editor identity', async () => {
    const model = ref<unknown[]>(['One', 'Two'])
    const wrapper = mount(defineComponent({ setup: () => () => h(DynamicField, { field, modelValue: model.value, 'onUpdate:modelValue': value => { model.value = value as unknown[] } }) }))
    const first = wrapper.find('input').element
    await wrapper.get('[aria-label="Переместить значение 1 вниз"]').trigger('click')
    expect(model.value).toEqual(['Two', 'One'])
    expect(wrapper.findAll('input')[1]!.element).toBe(first)
    const add = () => wrapper.findAll('button').find(b => b.text() === 'Добавить')!
    await add().trigger('click')
    expect(model.value).toEqual(['Two', 'One', ''])
    expect(add().attributes('disabled')).toBeDefined()
    await wrapper.findAll('input')[2]!.setValue('Three')
    expect(model.value).toEqual(['Two', 'One', 'Three'])
    await wrapper.get('[aria-label="Удалить значение 2"]').trigger('click')
    await wrapper.get('[aria-label="Удалить значение 2"]').trigger('click')
    expect(model.value).toEqual(['Two'])
    expect(wrapper.get('[aria-label="Удалить значение 1"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('wraps custom scalar editors, forwards context and indexed errors', async () => {
    const editor = defineComponent({ props: ['modelValue', 'siteId', 'accessToken'], setup: props => () => h('span', String(props.modelValue)) })
    const registry = new AdminPluginRegistry([{ code: 'example', fieldEditors: { 'example.scalar': editor } }])
    const wrapper = mount(DynamicField, { props: { field: { ...field, type: 'example.text', editor: 'example.scalar' }, modelValue: ['One'], siteId: 7, accessToken: 'test', errors: { 'items[0]': 'Ошибка значения' } }, global: { provide: { [adminPluginRegistryKey as symbol]: registry } } })
    expect(createFieldValues([{ ...field, type: 'example.text', editor: 'example.scalar' }])).toEqual({ items: [] })
    expect(validateFieldValues([{ ...field, type: 'example.text', editor: 'example.scalar' }], { items: [''] }, registry)).toHaveProperty('items[0]')
    expect(wrapper.findComponent(editor).props()).toMatchObject({ modelValue: 'One', siteId: 7, accessToken: 'test' })
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ElFormItem).props('error')).toBe('Ошибка значения')
    wrapper.unmount()
  })
  it.each(['string', 'textarea', 'email', 'phone', 'int', 'float', 'file', 'media', 'select', 'example.text'])('initializes %s as an array', type => {
    expect(createFieldValues([{ ...field, type }])).toEqual({ items: [] })
  })
  it('validates count, elements, numeric zero and nested paths', () => {
    expect(validateFieldValues([field], { items: [] })).toHaveProperty('items')
    expect(validateFieldValues([field], { items: [''] })).toHaveProperty('items[0]')
    const number = { ...field, type: 'int', validators: [{ type: 'min', options: { value: 0 } }, { type: 'max', options: { value: 10 } }] }
    expect(validateFieldValues([number], { items: [0, 3] })).toEqual({})
    expect(validateFieldValues([number], { items: [0, 11] })).toHaveProperty('items[1]')
    expect(validateFieldValues([{ ...field, type: 'email' }], { items: ['a@example.test', 'invalid'] })).toHaveProperty('items[1]')
    const nested = { key: 'rows', type: 'repeater', label: 'Rows', required: false, validators: [], options: { fields: [number] } }
    expect(validateFieldValues([nested], { rows: [{ items: [11] }] })).toHaveProperty('rows[0].items[0]')
  })
  it('keeps a multi-select and displays indexed choice errors', () => {
    const definition = { ...field, type: 'select', options: { ...field.options, choices: [{ value: 'a', label: 'A' }] } }
    const wrapper = mount(DynamicField, { props: { field: definition, modelValue: ['a'], errors: { 'items[0]': 'Недоступный вариант' } } })
    expect(wrapper.find('.multiple-field').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElSelect' }).props('multiple')).toBe(true)
    expect(wrapper.text()).toContain('Недоступный вариант')
    expect(validateFieldValues([definition], { items: ['a', 'a'] })).toHaveProperty('items[1]')
    wrapper.unmount()
  })

  it('uses the image editor for each item in a multiple Media field', () => {
    const definition: FieldDefinition = {
      key: 'gallery', type: 'media', label: 'Галерея', required: false, validators: [], options: { multiple: true },
    }
    const wrapper = mount(DynamicField, { props: { field: definition, modelValue: [11, 12], siteId: 7, accessToken: 'token' } })
    const fields = wrapper.findAllComponents({ name: 'MediaImageField' })
    expect(fields).toHaveLength(2)
    expect(fields.map(field => field.props())).toEqual([
      expect.objectContaining({ modelValue: 11, siteId: 7, accessToken: 'token' }),
      expect.objectContaining({ modelValue: 12, siteId: 7, accessToken: 'token' }),
    ])
    wrapper.unmount()
  })
})
