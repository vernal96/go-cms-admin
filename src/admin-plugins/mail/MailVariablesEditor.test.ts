// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { FieldDefinition, ValidatorMetadata } from '../../types/admin'
import MailVariablesEditor from './MailVariablesEditor.vue'

const available: ValidatorMetadata[] = [{ code: 'min', label: 'Минимум', options: [{ key: 'value', label: 'Значение', type: 'int', required: true }], field_types: ['int'] }]
const variable = (key: string, invalid = false): FieldDefinition => ({ key, label: key, type: 'int', required: false, validators: invalid ? [{ type: 'min', options: {} }] : [] })

describe('Mail variable editor validation lifecycle', () => {
 it.each([0, 1])('stops validating deleted variable at index %i', async (index) => {
  const variables = [variable('first'), variable('second')]
  variables[index] = variable('invalid', true)
  const wrapper = mount(MailVariablesEditor, { props: { modelValue: variables, availableValidators: available, 'onUpdate:modelValue': (value: FieldDefinition[]) => wrapper.setProps({ modelValue: value }) } })
  const validate = () => (wrapper.vm as unknown as { validate(): void }).validate()
  expect(validate).toThrow('Проверьте настройки')
  await wrapper.findAll('button[aria-label="Удалить переменную"]')[index]!.trigger('click')
  expect(wrapper.props('modelValue')).toHaveLength(1)
  expect(validate).not.toThrow()
  await wrapper.setProps({ modelValue: [variable('remaining', true)] })
  expect(validate).toThrow('Проверьте настройки')
  await wrapper.get('button[aria-label="Удалить переменную"]').trigger('click')
  expect(validate).not.toThrow()
  wrapper.unmount()
 })
})
