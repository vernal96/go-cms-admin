// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ElSelect } from 'element-plus'
import ValidatorEditor from './ValidatorEditor.vue'
import ConfigurationEditor from './ConfigurationEditor.vue'
import type { ValidatorDefinition, ValidatorMetadata } from '../../types/admin'

const available: ValidatorMetadata[] = [
 { code: 'min', label: 'Минимум', options: [{ key: 'value', label: 'Значение', type: 'float', required: true }], field_types: ['int', 'float'] },
 { code: 'max', label: 'Максимум', options: [{ key: 'value', label: 'Значение', type: 'float', required: true }], field_types: ['int', 'float'] },
 { code: 'example.custom', label: 'Своя проверка', options: [{ key: 'prefix', label: 'Префикс', type: 'string', required: true }], field_types: ['string'] },
]

describe('validator editor', () => {
 it('forgets removed option editors when replaced with a validator without options', async () => {
  const wrapper = mount(ValidatorEditor, { props: {
   modelValue: [{ type: 'min', options: {} }], fieldType: 'int',
   available: [...available, { code: 'example.no-options', label: 'Без настроек', options: [], field_types: ['int'] }],
   'onUpdate:modelValue': (value: ValidatorDefinition[]) => wrapper.setProps({ modelValue: value }),
  } })
  const validate = () => (wrapper.vm as unknown as { validate(): void }).validate()
  expect(validate).toThrow('Проверьте настройки')
  await wrapper.findAll('button').find(item => item.text() === 'Удалить')!.trigger('click')
  wrapper.getComponent(ElSelect).vm.$emit('update:modelValue', 'example.no-options')
  await wrapper.vm.$nextTick()
  await wrapper.findAll('button').find(item => item.text() === 'Добавить')!.trigger('click')
  expect(validate).not.toThrow()
  // Replacing/removing other entries must still validate the editors that remain.
  await wrapper.setProps({ modelValue: [{ type: 'min', options: {} }, { type: 'max', options: { value: 10 } }] })
  await wrapper.findAll('button').find(item => item.text() === 'Ниже' && item.attributes('disabled') === undefined)!.trigger('click')
  expect(validate).toThrow('Проверьте настройки')
  await wrapper.findAllComponents(ConfigurationEditor)[1]!.vm.$emit('update:modelValue', { value: 1 })
  await wrapper.vm.$nextTick()
  expect(validate).not.toThrow()
  wrapper.unmount()
 })
 it('renders backend metadata and preserves add, configure, order and remove operations', async () => {
  const wrapper = mount(ValidatorEditor, { props: { modelValue: [{ type: 'min', options: { value: 1 } }], available, fieldType: 'int', 'onUpdate:modelValue': (value: ValidatorDefinition[]) => wrapper.setProps({ modelValue: value }) } })
  expect(wrapper.text()).toContain('Минимум')
  expect(wrapper.getComponent(ConfigurationEditor).props('fields')).toEqual(available[0]!.options)
  wrapper.getComponent(ElSelect).vm.$emit('update:modelValue', 'max')
  await wrapper.vm.$nextTick()
  await wrapper.findAll('button').find(item => item.text() === 'Добавить')!.trigger('click')
  await wrapper.vm.$nextTick()
  expect(wrapper.props('modelValue').map(item => item.type)).toEqual(['min', 'max'])
  wrapper.findAllComponents(ConfigurationEditor)[1]!.vm.$emit('update:modelValue', { value: 100 })
  await wrapper.vm.$nextTick()
  expect(wrapper.props('modelValue')[1]).toEqual({ type: 'max', options: { value: 100 } })
  await wrapper.findAll('button').find(item => item.text() === 'Выше' && item.attributes('disabled') === undefined)!.trigger('click')
  expect(wrapper.props('modelValue').map(item => item.type)).toEqual(['max', 'min'])
  await wrapper.findAll('button').find(item => item.text() === 'Удалить')!.trigger('click')
  expect(wrapper.props('modelValue').map(item => item.type)).toEqual(['min'])
  wrapper.unmount()
 })
 it('shows incompatible validators after type changes and accepts contributed metadata', async () => {
  const wrapper = mount(ValidatorEditor, { props: { modelValue: [{ type: 'example.custom', options: { prefix: 'go-' } }], available, fieldType: 'string' } })
  expect(wrapper.text()).toContain('Своя проверка')
  expect(wrapper.getComponent(ConfigurationEditor).props('fields')).toEqual(available[2]!.options)
  await wrapper.setProps({ fieldType: 'int' })
  expect(wrapper.text()).toContain('несовместима')
  expect(() => (wrapper.vm as unknown as { validate(): void }).validate()).toThrow('несовместим')
  wrapper.unmount()
 })
})
