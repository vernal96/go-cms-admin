// @vitest-environment jsdom

import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { FieldDefinition } from '../../types/admin'
import DynamicField from './DynamicField.vue'

function definition(type: string): FieldDefinition {
  return {
    key: type,
    type,
    label: type,
    required: false,
    validators: [],
    options: {
      step: 0.1,
      choices: [{ value: 'one', label: 'One' }],
      multiple: type === 'select',
    },
  }
}

describe('DynamicField', () => {
  it.each([
    ['string', 'TextField'],
    ['email', 'TextField'],
    ['phone', 'TextField'],
    ['int', 'NumberField'],
    ['float', 'NumberField'],
    ['checkbox', 'CheckboxField'],
    ['radio', 'RadioField'],
    ['select', 'SelectField'],
    ['textarea', 'TextareaField'],
  ])(
    'dispatches %s to %s and preserves v-model values',
    async (type, component) => {
      const wrapper = shallowMount(DynamicField, {
        props: {
          field: definition(type),
          modelValue: type === 'select' ? [] : '',
			siteId: 0,
			accessToken: '',
			resourceTemplates: [],
        },
      })
      const rendered = wrapper.findComponent({ name: component })
      expect(rendered.exists()).toBe(true)
      const nextValue =
        type === 'int'
          ? 3
          : type === 'float'
            ? 1.2
            : type === 'select'
              ? ['one']
              : 'one'
      rendered.vm.$emit('update:modelValue', nextValue)
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([nextValue])
    },
  )

	it('renders an explicit error instead of a fallback input', () => {
    const wrapper = shallowMount(DynamicField, {
		props: { field: definition('future'), siteId: 0, accessToken: '', resourceTemplates: [] },
    })
    expect(wrapper.findComponent({ name: 'ElAlert' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ElInput' }).exists()).toBe(false)
  })

	it('renders the semantic resource-template editor from backend metadata', () => {
		const field = { ...definition('string'), editor: 'resource-template' }
		const wrapper = shallowMount(DynamicField, {
			props: {
				field, siteId: 7, accessToken: 'token', resourceTemplates: [{ code: 'article', label: 'Article' }],
			},
		})
		const select = wrapper.findComponent({ name: 'SelectField' })
		expect(select.exists()).toBe(true)
		expect(select.props('choices')).toEqual([{ value: 'article', label: 'Article' }])
	})

	it('passes the site and credentials to the resource picker editor', () => {
		const wrapper = shallowMount(DynamicField, {
			props: { field: { ...definition('string'), editor: 'resource-picker' }, siteId: 7, accessToken: 'token' },
		})
		expect(wrapper.findComponent({ name: 'ResourcePickerField' }).props()).toMatchObject({ siteId: 7, accessToken: 'token' })
	})

	it('uses the shared material reference editor before the legacy resource-picker editor', () => {
		const field: FieldDefinition = {
			...definition('resource_reference'),
			editor: 'resource-picker',
			options: { templates: ['document'], storage_kinds: ['tree', 'library_item'] },
		}
		const wrapper = shallowMount(DynamicField, {
			props: { field, modelValue: 37, siteId: 7, accessToken: 'token' },
		})
		const picker = wrapper.findComponent({ name: 'ResourceReferenceField' })
		expect(picker.exists()).toBe(true)
		expect(picker.props()).toMatchObject({
			modelValue: 37,
			templates: ['document'],
			storageKinds: ['tree', 'library_item'],
		})
	})

	it.each([
		['resource-type-picker', 'ResourceTypePickerField'],
		['resource-field-picker', 'ResourceFieldPickerField'],
		['filter-builder', 'FilterBuilderField'],
		['sort-builder', 'SortBuilderField'],
	])('renders the %s semantic editor and forwards its field choices', (editor, component) => {
		const field = { ...definition('select'), editor, options: { ...definition('select').options, choices: [{ value: 'resource.title', label: 'Заголовок' }], multiple: true } }
		const wrapper = shallowMount(DynamicField, { props: { field, modelValue: [] } })
		expect(wrapper.findComponent({ name: component }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: component }).props('field')).toEqual(field)
		expect(wrapper.findComponent({ name: 'ElAlert' }).exists()).toBe(false)
	})
})
