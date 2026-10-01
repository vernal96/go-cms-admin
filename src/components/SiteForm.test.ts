// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { adminRequest } from '../api/admin-api'
import SiteForm from './SiteForm.vue'

vi.mock('../api/admin-api', () => ({ adminRequest: vi.fn() }))

const requestMock = vi.mocked(adminRequest)

describe('SiteForm', () => {
  beforeEach(() => {
    requestMock.mockReset()
    requestMock.mockResolvedValue({
      items: [
        {
          code: 'dev',
          name: 'Development',
          fields: [
            {
              key: 'title',
              type: 'string',
              label: 'Title',
              required: true,
              validators: [{ type: 'min_length', options: { value: 2 } }],
            },
          ],
			editor_tabs: [
				{ code: 'main', label: 'Main', fields: ['title'] },
			],
        },
      ],
    })
  })

  it('keeps server errors in the summary and local errors under fields', async () => {
    const errors = [{ key: 'title', code: 'regex', params: { value: '^ok$' } }]
    const wrapper = shallowMount(SiteForm, {
      props: { accessToken: 'token', fieldErrors: errors },
      global: { renderStubDefaultSlot: true },
    })
    await flushPromises()
    const dynamic = wrapper.getComponent({ name: 'DynamicFieldsForm' })
    expect(dynamic.props('errors')).toEqual({})
    expect(wrapper.getComponent({ name: 'ServerValidationErrors' }).props('errors')).toEqual(errors)
    const form = wrapper.getComponent({ name: 'ElForm' })
    Object.assign(form.props('model'), { domain: 'example.com', settings: { title: 'x' } })
    form.vm.$emit('submit', new Event('submit'))
    await flushPromises()
    expect(dynamic.props('errors')).toEqual({ title: 'Минимум символов: 2.' })
    expect(wrapper.emitted('clearValidation')).toBeTruthy()
    expect(wrapper.emitted('submit')).toBeUndefined()
    wrapper.unmount()
  })

  it('initializes and submits settings from profile metadata', async () => {
    const wrapper = shallowMount(SiteForm, {
      props: { accessToken: 'token' },
      global: { renderStubDefaultSlot: true },
    })
    await flushPromises()

    const formComponent = wrapper.findComponent({ name: 'ElForm' })
    const model = formComponent.props('model') as Record<string, unknown>
    Object.assign(model, {
      domain: ' example.com ',
      profile_code: 'dev',
      locale: ' ru-RU ',
      is_public: true,
      settings: { title: 'Demo' },
    })
    formComponent.vm.$emit('submit', new Event('submit'))
    await flushPromises()

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      domain: 'example.com',
      profile_code: 'dev',
      locale: 'ru-RU',
      is_public: true,
      settings: { title: 'Demo' },
    })
  })

	it('uses tabbed settings only while editing a site', async () => {
		const createWrapper = shallowMount(SiteForm, {
			props: { accessToken: 'token' },
			global: { renderStubDefaultSlot: true },
		})
		await flushPromises()
		expect(createWrapper.findComponent({ name: 'TabbedDynamicFieldsForm' }).exists()).toBe(false)
		expect(createWrapper.findComponent({ name: 'DynamicFieldsForm' }).exists()).toBe(true)

		const editWrapper = shallowMount(SiteForm, {
			props: { accessToken: 'token', editing: true },
			global: { renderStubDefaultSlot: true },
		})
		await flushPromises()
		expect(editWrapper.findComponent({ name: 'TabbedDynamicFieldsForm' }).exists()).toBe(true)
		expect(editWrapper.findComponent({ name: 'DynamicFieldsForm' }).exists()).toBe(false)
	})
})
