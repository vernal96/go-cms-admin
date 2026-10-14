// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { FieldDefinition, ValidatorMetadata } from '../../types/admin'
import MailVariablesEditor from './MailVariablesEditor.vue'

const available: ValidatorMetadata[] = [{ code: 'min', label: 'Минимум', options: [{ key: 'value', label: 'Значение', type: 'int', required: true }], field_types: ['int'] }]
const variable = (key: string, invalid = false): FieldDefinition => ({ key, label: key, type: 'int', required: false, validators: invalid ? [{ type: 'min', options: {} }] : [] })

describe('Mail variable editor validation lifecycle', () => {
 it('shows Media configuration after selecting File and emits complete media options', async () => {
  let current: FieldDefinition[] = [{ key: 'attachment', type: 'string', label: 'Вложение', required: false, validators: [] }]
  let wrapper: ReturnType<typeof mount>
  wrapper = mount(MailVariablesEditor, {
   props: {
    modelValue: current,
    'onUpdate:modelValue': (value: FieldDefinition[]) => {
     current = value
     void wrapper.setProps({ modelValue: value })
    },
   },
  })

  wrapper.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 'media')
  await wrapper.vm.$nextTick()
  expect(wrapper.text()).toContain('Настройки медиа-поля')
  expect(wrapper.findAllComponents({ name: 'ElInput' })).toHaveLength(6)
  const updateInput = async (index: number, value: string) => {
   wrapper.findAllComponents({ name: 'ElInput' })[index]!.vm.$emit('update:modelValue', value)
   await wrapper.vm.$nextTick()
  }
  await updateInput(2, 'public')
  await updateInput(3, 'mail/attachments')
  await updateInput(4, 'mail_attachment')
  await updateInput(5, 'application/pdf,image/*')
  wrapper.findAllComponents({ name: 'ElCheckbox' })[1]!.vm.$emit('update:modelValue', true)
  await wrapper.vm.$nextTick()

  expect(current[0]).toMatchObject({
   type: 'media',
   options: {
    disk: 'public',
    virtual_path: 'mail/attachments',
    settings_code: 'mail_attachment',
    mime_types: ['application/pdf', 'image/*'],
    multiple: true,
   },
  })
  wrapper.unmount()
 })

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
