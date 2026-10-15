// @vitest-environment jsdom

import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { WidgetDefinition } from '../../types/admin'
import WidgetSettingsDialog from './WidgetSettingsDialog.vue'

function definition(tabs: WidgetDefinition['editor_tabs']): WidgetDefinition {
  return {
    code: 'settings_widget',
    module_code: 'test',
    module_label: 'Test',
    module_description: '',
    label: 'Settings',
    description: '',
    fields: [
      { key: 'title', type: 'string', label: 'Title', required: false, validators: [] },
      { key: 'color', type: 'string', label: 'Color', required: false, validators: [] },
    ],
    editor_tabs: tabs,
    summary_fields: [], param_types: {},
    views: [],
  }
}

describe('WidgetSettingsDialog tabs', () => {
  it('selects the first available tab and recovers when the active tab disappears', async () => {
    const wrapper = shallowMount(WidgetSettingsDialog, {
      props: {
        modelValue: true,
        definition: definition([
          { code: 'content', label: 'Content', fields: ['title'] },
          { code: 'appearance', label: 'Appearance', fields: ['color'] },
        ]),
        widget: null, sources: [],
        siteId: 7,
        resourceId: 9,
        accessToken: 'token',
      },
      global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
    })
    const tabs = () => wrapper.getComponent({ name: 'ElTabs' })
    expect(tabs().props('modelValue')).toBe('content')

    tabs().vm.$emit('update:modelValue', 'appearance')
    await wrapper.vm.$nextTick()
    expect(tabs().props('modelValue')).toBe('appearance')

    await wrapper.setProps({
      definition: definition([{ code: 'content', label: 'Content', fields: ['title'] }]),
    })
    expect(tabs().props('modelValue')).toBe('content')
  })
})

it('reopens a bound required parameter and saves the reference without a literal', async () => {
  const def = definition([])
  def.fields[0]!.required = true
  def.param_types = { title: { type: 'string', multiple: false } }
  const wrapper = shallowMount(WidgetSettingsDialog, {
    props: {
      modelValue: true, definition: def, siteId: 7, resourceId: 9, accessToken: 'token',
      sources: [{ kind: 'resource_property', key: 'title', label: 'Название', type: 'string', multiple: false }],
      widget: { id: 1, code: def.code, area: 'body', position: 0, view: 'default', columns: 12,
        margin_top: 0, margin_bottom: 0, enabled: true, params: {},
        param_bindings: { title: { kind: 'resource_property', key: 'title' } } },
    }, global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
  })
  const fields = wrapper.getComponent({ name: 'WidgetParamFields' })
  expect(fields.props('bindings')).toEqual({ title: { kind: 'resource_property', key: 'title' } })
  expect(fields.props('modelValue')).not.toHaveProperty('title')
  wrapper.findAllComponents({ name: 'ElButton' }).at(-1)!.vm.$emit('click')
  await wrapper.vm.$nextTick()
  const saved = wrapper.emitted('save')?.[0]?.[0] as Record<string, any>
  expect(saved.param_bindings).toEqual({ title: { kind: 'resource_property', key: 'title' } })
  expect(saved.params).not.toHaveProperty('title')
})

it('rejects a source that is no longer compatible with the widget field', async () => {
  const def = definition([])
  def.param_types = { title: { type: 'string', multiple: false } }
  const wrapper = shallowMount(WidgetSettingsDialog, {
    props: { modelValue: true, definition: def, widget: null, siteId: 7, resourceId: 9, accessToken: 'token', sources: [] },
    global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
  })
  wrapper.getComponent({ name: 'WidgetParamFields' }).vm.$emit('update:bindings', { title: { kind: 'resource_field', key: 'removed' } })
  await wrapper.vm.$nextTick()
  wrapper.findAllComponents({ name: 'ElButton' }).at(-1)!.vm.$emit('click')
  await wrapper.vm.$nextTick()
  expect(wrapper.emitted('save')).toBeUndefined()
  expect(wrapper.getComponent({ name: 'WidgetParamFields' }).props('errors').title).toContain('совместимое')
})

it('preserves selected template fields and blocks saving when a selected key becomes stale', async () => {
  const def = definition([])
  def.fields = [{ key: 'fields', type: 'string', label: 'Поля', editor: 'template-field-picker', required: true, validators: [], options: { multiple: true } }]
  def.param_types = { fields: { type: 'string', multiple: true } }
  const wrapper = shallowMount(WidgetSettingsDialog, {
    props: {
      modelValue: true, definition: def,
      templateFields: [{ key: 'title', type: 'string', label: 'Название', required: false, validators: [] }],
      widget: { id: 1, code: def.code, area: 'body', position: 0, view: 'default', columns: 12,
        margin_top: 0, margin_bottom: 0, enabled: true, params: { fields: ['title'] }, param_bindings: {} },
      sources: [], siteId: 7, resourceId: 9, accessToken: 'token',
    }, global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
  })

  await wrapper.setProps({ templateFields: [] })
  const paramEditor = wrapper.getComponent({ name: 'WidgetParamFields' })
  expect(paramEditor.props('modelValue')).toEqual({ fields: ['title'] })
  expect(wrapper.findAllComponents({ name: 'ElButton' }).at(-1)!.props('disabled')).toBe(true)
  wrapper.findAllComponents({ name: 'ElButton' }).at(-1)!.vm.$emit('click')
  await wrapper.vm.$nextTick()
  expect(wrapper.emitted('save')).toBeUndefined()
  expect(paramEditor.props('errors').fields).toContain('Недоступные поля шаблона')
})

it('requires at least one template field before saving a new resource-fields widget', async () => {
  const def = definition([])
  def.fields = [{ key: 'fields', type: 'string', label: 'Поля', editor: 'template-field-picker', required: true, validators: [], options: { multiple: true } }]
  def.param_types = { fields: { type: 'string', multiple: true } }
  const wrapper = shallowMount(WidgetSettingsDialog, {
    props: { modelValue: true, definition: def, widget: null, templateFields: [{ key: 'title', type: 'string', label: 'Название', required: false, validators: [] }], sources: [], siteId: 7, resourceId: 9, accessToken: 'token' },
    global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
  })
  wrapper.findAllComponents({ name: 'ElButton' }).at(-1)!.vm.$emit('click')
  await wrapper.vm.$nextTick()
  expect(wrapper.emitted('save')).toBeUndefined()
  expect(wrapper.getComponent({ name: 'WidgetParamFields' }).props('errors').fields).toContain('Выберите хотя бы одно')
})

it('emits the selected template field when saving the resource-fields widget', async () => {
  const def = definition([])
  def.code = 'core_resource_fields'
  def.fields = [{ key: 'fields', type: 'string', label: 'Поля', editor: 'template-field-picker', required: true, validators: [], options: { multiple: true } }]
  def.param_types = { fields: { type: 'string', multiple: true } }
  const wrapper = shallowMount(WidgetSettingsDialog, {
    props: {
      modelValue: true, definition: def, widget: null,
      templateFields: [{ key: 'gallery', type: 'media', label: 'Галерея', required: false, validators: [] }],
      sources: [], siteId: 7, resourceId: 9, accessToken: 'token',
    }, global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
  })

  wrapper.getComponent({ name: 'WidgetParamFields' }).vm.$emit('update:modelValue', { fields: ['gallery'] })
  await wrapper.vm.$nextTick()
  wrapper.findAllComponents({ name: 'ElButton' }).at(-1)!.vm.$emit('click')
  await wrapper.vm.$nextTick()

  expect(wrapper.emitted('save')).toHaveLength(1)
  expect((wrapper.emitted('save')?.[0]?.[0] as { params: Record<string, unknown> }).params).toEqual({ fields: ['gallery'] })
})

it('shows the server validation message in the widget dialog', () => {
  const wrapper = shallowMount(WidgetSettingsDialog, {
    props: {
      modelValue: true, definition: definition([]), widget: null,
      sources: [], siteId: 7, resourceId: 9, accessToken: 'token',
      serverErrors: [], serverMessage: 'Поле шаблона недоступно',
    },
    global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
  })
  expect(wrapper.getComponent({ name: 'ServerValidationErrors' }).props('message')).toBe('Поле шаблона недоступно')
})
