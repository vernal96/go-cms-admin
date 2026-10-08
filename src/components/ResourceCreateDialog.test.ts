// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminAPIError, adminRequest } from '../api/admin-api'
import type { ResourceTreeItem } from '../types/admin'
import ResourceCreateDialog from './ResourceCreateDialog.vue'

vi.mock('../api/admin-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/admin-api')>()),
  adminRequest: vi.fn(),
}))

const requestMock = vi.mocked(adminRequest)

describe('ResourceCreateDialog', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  it('creates a root Page with the minimal supported payload', async () => {
	const created: ResourceTreeItem = {
		id: 10,
		version: 1,
      parent_id: null,
      template_code: null,
      icon: 'document',
      title: 'Home',
      menu_title: '',
      display_title: 'Home',
		sort: 0,
		in_menu: true,
		deleted: false,
		published: true,
		deleted_at: null,
      has_children: false,
	can_create_child: true,
	can_transfer_site: true,
    }
    requestMock
      .mockResolvedValueOnce({
        types: [
			{ code: 'page', label: 'Страница', capabilities: { supports_template: true, supports_content: true, supports_fields: true, mutable_type: true }, settings_fields: [], settings_defaults: {}, content_types: [{ code: 'html', label: 'HTML', editor: 'html' }] },
			{ code: 'link', label: 'Ссылка', capabilities: { mutable_type: true }, settings_fields: [], settings_defaults: {}, content_types: [] },
        ],
        templates: [
          {
            code: 'page',
            label: 'Страница',
            icon: 'document',
			editor_tabs: [{ code: 'content', label: 'Контент', fields: ['page_title'] }],
            fields: [
              {
                key: 'page_title',
                type: 'string',
                label: 'Заголовок',
                required: true,
                validators: [],
              },
            ],
          },
        ],
			extensions: [],
      })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce(created)
    const wrapper = shallowMount(ResourceCreateDialog, {
      props: { accessToken: 'token', siteId: 7 },
      global: {
        renderStubDefaultSlot: true,
        stubs: {
          ElDialog: { template: '<div><slot /><slot name="footer" /></div>' },
        },
      },
    })

    await (
      wrapper.vm as unknown as {
        open(parent: ResourceTreeItem | null): Promise<void>
      }
    ).open(null)
    await flushPromises()
    expect(wrapper.findComponent({ name: 'TabbedDynamicFieldsForm' }).exists()).toBe(false)
    const model = wrapper
      .findComponent({ name: 'ElForm' })
      .props('model') as Record<string, unknown>
    Object.assign(model, {
      title: ' Home ',
      menu_title: '',
      slug: '',
		fields: {},
    })

    const buttons = wrapper.findAllComponents({ name: 'ElButton' })
    buttons[buttons.length - 1]?.vm.$emit('click')
    await flushPromises()

    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      '/api/sites/7/resources',
      'token',
      expect.objectContaining({ method: 'POST' }),
    )
    const init = requestMock.mock.calls[2]?.[2] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual({
      parent_id: null,
      type: 'page',
      template_code: null,
		content_type: 'html',
      content: '',
      target_resource_id: null,
      title: 'Home',
      menu_title: '',
      slug: '',
		fields: {},
		type_settings: {},
    })
    expect(wrapper.emitted('created')?.[0]).toEqual([created, null])
  })

  it('uses capabilities for a custom target resource type', async () => {
    requestMock
      .mockResolvedValueOnce({
        types: [{
			code: 'custom_target', label: 'Товар каталога',
			capabilities: { supports_target_resource: true, supports_content: true, mutable_type: true },
			settings_fields: [{ key: 'catalog_mode', type: 'string', label: 'Режим каталога', required: true, validators: [] }],
			settings_defaults: { catalog_mode: 'standard' },
			content_types: [{ code: 'markdown', label: 'Markdown', editor: 'textarea' }],
		}],
        templates: [], widgets: [], extensions: [],
      })
      .mockResolvedValueOnce({ items: [{ id: 12, parent_id: null, type: 'page', display_title: 'Target', path: '/target' }] })
      .mockResolvedValueOnce({ id: 13, title: 'Reference' })
    const wrapper = shallowMount(ResourceCreateDialog, {
      props: { accessToken: 'token', siteId: 7 },
      global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
    })
    await (wrapper.vm as unknown as { open(parent: ResourceTreeItem | null): Promise<void> }).open(null)
    await flushPromises()
    const model = wrapper.findComponent({ name: 'ElForm' }).props('model') as Record<string, unknown>
		expect(model.type_settings).toEqual({ catalog_mode: 'standard' })
		expect(model.content_type).toBe('markdown')
    Object.assign(model, { title: 'Reference', target_resource_id: 12 })
    const buttons = wrapper.findAllComponents({ name: 'ElButton' })
    buttons[buttons.length - 1]?.vm.$emit('click')
    await flushPromises()

    const init = requestMock.mock.calls[2]?.[2] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
		type: 'custom_target', target_resource_id: 12, template_code: null,
		content_type: 'markdown', type_settings: { catalog_mode: 'standard' },
    }))
    expect(wrapper.findAllComponents({ name: 'ElSelect' })).toHaveLength(2)
  })

  it('shows page first and selects it when metadata returns another type first', async () => {
    requestMock
      .mockResolvedValueOnce({
        types: [
          { code: 'link', label: 'Ссылка', capabilities: { mutable_type: true }, settings_fields: [], settings_defaults: {}, content_types: [] },
          { code: 'event', label: 'Событие', capabilities: { mutable_type: true }, settings_fields: [], settings_defaults: {}, content_types: [] },
          { code: 'page', label: 'Обычная страница', capabilities: { mutable_type: true }, settings_fields: [], settings_defaults: {}, content_types: [] },
        ],
        templates: [], widgets: [], extensions: [],
      })
      .mockResolvedValueOnce({ items: [] })
    const wrapper = shallowMount(ResourceCreateDialog, {
      props: { accessToken: 'token', siteId: 7 },
      global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
    })
    await (wrapper.vm as unknown as { open(parent: ResourceTreeItem | null): Promise<void> }).open(null)
    await flushPromises()

    const model = wrapper.findComponent({ name: 'ElForm' }).props('model') as Record<string, unknown>
    expect(model.type).toBe('page')
    const typeOptions = wrapper.findAllComponents({ name: 'ElOption' }).slice(0, 3)
    expect(typeOptions.map(option => option.props('value'))).toEqual(['page', 'link', 'event'])
    expect(typeOptions[0]!.props('label')).toBe('Обычная страница')
  })

  it('renders template tabs and passes editor context to nested field editors', async () => {
    const templates = [{
      code: 'news', label: 'Новость', icon: 'newspaper', supports_resource_widgets: false,
      widget_areas: [], widget_value_sources: [],
      editor_tabs: [{ code: 'main', label: 'Основное', fields: ['gallery', 'related'] }],
      fields: [
        { key: 'gallery', type: 'repeater', label: 'Галерея', required: false, validators: [], options: { fields: [
          { key: 'image', type: 'media', label: 'Изображение', required: true, validators: [], options: { multiple: true } },
          { key: 'caption', type: 'string', label: 'Подпись', required: false, validators: [] },
        ] } },
        { key: 'related', type: 'string', label: 'Связанный ресурс', required: false, validators: [], editor: 'resource-picker' },
      ],
    }]
    requestMock
      .mockResolvedValueOnce({
        types: [{ code: 'page', label: 'Страница', capabilities: { supports_template: true, supports_fields: true, mutable_type: true }, settings_fields: [], settings_defaults: {}, content_types: [] }],
        templates, widgets: [], extensions: [],
      })
      .mockResolvedValueOnce({ items: [] })

    const wrapper = shallowMount(ResourceCreateDialog, {
      props: { accessToken: 'token', siteId: 7 },
      global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
    })
    await (wrapper.vm as unknown as { open(parent: ResourceTreeItem | null): Promise<void> }).open(null)
    await flushPromises()
    const model = wrapper.findComponent({ name: 'ElForm' }).props('model') as Record<string, unknown>
    model.template_code = 'news'
    await flushPromises()

    const fields = wrapper.findComponent({ name: 'TabbedDynamicFieldsForm' })
    expect(fields.exists()).toBe(true)
    expect(fields.props()).toMatchObject({
      fields: templates[0]!.fields,
      editorTabs: templates[0]!.editor_tabs,
      siteId: 7,
      accessToken: 'token',
      resourceTemplates: templates,
    })
    expect(wrapper.findComponent({ name: 'ResourceIcon' }).props('icon')).toBe('newspaper')
  })

  it('keeps the ordinary dynamic form when a template has no editor tabs', async () => {
    const templates = [{
      code: 'plain', label: 'Обычная страница', icon: 'document', supports_resource_widgets: false,
      widget_areas: [], widget_value_sources: [], editor_tabs: [],
      fields: [{ key: 'subtitle', type: 'string', label: 'Подзаголовок', required: false, validators: [] }],
    }]
    requestMock
      .mockResolvedValueOnce({
        types: [{ code: 'page', label: 'Страница', capabilities: { supports_template: true, supports_fields: true, mutable_type: true }, settings_fields: [], settings_defaults: {}, content_types: [] }],
        templates, widgets: [], extensions: [],
      })
      .mockResolvedValueOnce({ items: [] })
    const wrapper = shallowMount(ResourceCreateDialog, {
      props: { accessToken: 'token', siteId: 17 },
      global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
    })
    await (wrapper.vm as unknown as { open(parent: ResourceTreeItem | null): Promise<void> }).open(null)
    await flushPromises()
    const model = wrapper.findComponent({ name: 'ElForm' }).props('model') as Record<string, unknown>
    model.template_code = 'plain'
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TabbedDynamicFieldsForm' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'DynamicFieldsForm' }).props()).toMatchObject({
      fields: templates[0]!.fields,
      siteId: 17,
      accessToken: 'token',
      resourceTemplates: templates,
    })
  })

  it('preserves a server MIME error for display beside structured field errors', async () => {
    requestMock
      .mockResolvedValueOnce({
        types: [{ code: 'page', label: 'Страница', capabilities: { supports_fields: true, mutable_type: true }, settings_fields: [], settings_defaults: {}, content_types: [] }],
        templates: [], widgets: [], extensions: [],
      })
      .mockResolvedValueOnce({ items: [] })
      .mockRejectedValueOnce(new AdminAPIError(422, 'validation_failed', 'Файл должен иметь тип image/*', [{ key: 'logo', code: 'mime_type' }]))
    const wrapper = shallowMount(ResourceCreateDialog, {
      props: { accessToken: 'token', siteId: 7 },
      global: { renderStubDefaultSlot: true, stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
    })
    await (wrapper.vm as unknown as { open(parent: ResourceTreeItem | null): Promise<void> }).open(null)
    await flushPromises()
    const model = wrapper.findComponent({ name: 'ElForm' }).props('model') as Record<string, unknown>
    model.title = 'Новость'
    const buttons = wrapper.findAllComponents({ name: 'ElButton' })
    buttons[buttons.length - 1]?.vm.$emit('click')
    await flushPromises()
    expect(wrapper.getComponent({ name: 'ServerValidationErrors' }).props('message')).toBe('Файл должен иметь тип image/*')
    expect(wrapper.getComponent({ name: 'ServerValidationErrors' }).props('errors')).toEqual([{ key: 'logo', code: 'mime_type' }])
  })
})
