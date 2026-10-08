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

  it('shows server errors both in the summary and under fields', async () => {
    const errors = [{ key: 'title', code: 'regex', params: { value: '^ok$' } }]
    const wrapper = shallowMount(SiteForm, {
      props: { accessToken: 'token', fieldErrors: errors },
      global: { renderStubDefaultSlot: true },
    })
    await flushPromises()
    const dynamic = wrapper.getComponent({ name: 'DynamicFieldsForm' })
    expect(dynamic.props('errors')).toEqual({ title: 'Значение не соответствует требуемому формату.' })
    expect(wrapper.getComponent({ name: 'ServerValidationErrors' }).props('errors')).toEqual(errors)
    const form = wrapper.getComponent({ name: 'ElForm' })
    Object.assign(form.props('model'), { name: 'Example', domain: 'example.com', settings: { title: 'x' } })
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
      name: ' Example ',
      domain: ' example.com ',
      profile_code: 'dev',
      locale: ' ru-RU ',
      is_public: true,
      settings: { title: 'Demo' },
    })
    formComponent.vm.$emit('submit', new Event('submit'))
    await flushPromises()

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      name: 'Example',
      domain: 'example.com',
      profile_code: 'dev',
      locale: 'ru-RU',
      is_public: true,
      settings: { title: 'Demo' },
    })
  })

  it('requires a non-empty site name', async () => {
    const wrapper = shallowMount(SiteForm, {
      props: { accessToken: 'token' },
      global: { renderStubDefaultSlot: true },
    })
    await flushPromises()
    const form = wrapper.getComponent({ name: 'ElForm' })
    Object.assign(form.props('model'), { name: '   ', domain: 'example.com', profile_code: 'dev', locale: 'ru-RU' })
    form.vm.$emit('submit', new Event('submit'))
    await flushPromises()
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.getComponent({ name: 'ElAlert' }).props('title')).toContain('Заполните название')
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

describe('incomplete site settings', () => {
  const fields = [
    { key: 'logo', type: 'file', label: 'Logo', required: true, validators: [] },
    { key: 'title', type: 'string', label: 'Title', required: false, validators: [] },
    { key: 'tags', type: 'string', label: 'Tags', required: false, options: { multiple: true }, validators: [{ type: 'min_items', options: { value: 2 } }] },
    { key: 'enabled', type: 'checkbox', label: 'Enabled', required: true, validators: [] },
    { key: 'count', type: 'int', label: 'Count', required: true, validators: [{ type: 'min', options: { value: 0 } }] },
    { key: 'slides', type: 'repeater', label: 'Slides', required: false, validators: [], options: { fields: [{ key: 'title', type: 'string', label: 'Title', required: true, validators: [] }] } },
  ]

  beforeEach(() => {
    requestMock.mockReset()
    requestMock.mockResolvedValue({ items: [{ code: 'dev', name: 'Development', fields, editor_tabs: [] }] })
  })

  it('creates with empty parameters omitted while retaining false and zero', async () => {
    const wrapper = shallowMount(SiteForm, { props: { accessToken: 'token' }, global: { renderStubDefaultSlot: true } })
    await flushPromises()
    const form = wrapper.getComponent({ name: 'ElForm' })
    Object.assign(form.props('model'), { name: 'New', domain: 'new.test', settings: { logo: 7, title: '', tags: [], slides: [], enabled: false, count: 0 } })
    form.vm.$emit('submit', new Event('submit'))
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ settings: { logo: 7, enabled: false, count: 0 } })
    wrapper.unmount()
  })

  it('blocks create when an empty required logo is omitted from settings', async () => {
    const wrapper = shallowMount(SiteForm, { props: { accessToken: 'token' }, global: { renderStubDefaultSlot: true } })
    await flushPromises()
    const form = wrapper.getComponent({ name: 'ElForm' })
    Object.assign(form.props('model'), { name: 'New', domain: 'new.test', settings: { logo: null, title: 'Draft' } })
    form.vm.$emit('submit', new Event('submit'))
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.getComponent({ name: 'DynamicFieldsForm' }).props('errors')).toMatchObject({ logo: 'Поле обязательно.' })
    expect(form.props('model').settings.logo).toBeNull()
    wrapper.unmount()
  })

  it('requires empty parameters when editing and preserves the draft', async () => {
    const wrapper = shallowMount(SiteForm, { props: { accessToken: 'token', editing: true }, global: { renderStubDefaultSlot: true } })
    await flushPromises()
    const form = wrapper.getComponent({ name: 'ElForm' })
    const settings = { logo: null, title: 'Draft', tags: [], slides: [], enabled: false, count: 0 }
    Object.assign(form.props('model'), { name: 'New', domain: 'new.test', settings })
    form.vm.$emit('submit', new Event('submit'))
    await flushPromises()
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.getComponent({ name: 'TabbedDynamicFieldsForm' }).props('errors')).toMatchObject({ logo: 'Поле обязательно.' })
    expect(form.props('model').settings).toEqual(settings)
    await wrapper.setProps({ fieldErrors: [{ key: 'title', code: 'required' }] })
    expect(wrapper.getComponent({ name: 'TabbedDynamicFieldsForm' }).props('errors')).toMatchObject({ title: 'Поле обязательно.' })
    expect(form.props('model').settings.title).toBe('Draft')
    wrapper.unmount()
  })

  it.each([
    [{ logo: -1 }, 'logo'],
    [{ count: -1 }, 'count'],
    [{ tags: ['one'] }, 'tags'],
    [{ slides: [{}] }, 'slides[0].title'],
  ])('rejects populated invalid create settings %j', async (settings, key) => {
    const wrapper = shallowMount(SiteForm, { props: { accessToken: 'token' }, global: { renderStubDefaultSlot: true } })
    await flushPromises()
    const form = wrapper.getComponent({ name: 'ElForm' })
    Object.assign(form.props('model'), { name: 'New', domain: 'new.test', settings })
    form.vm.$emit('submit', new Event('submit'))
    await flushPromises()
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.getComponent({ name: 'DynamicFieldsForm' }).props('errors')[key]).toBeTruthy()
    wrapper.unmount()
  })
})
