// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminAPIError, adminRequest } from '../../api/admin-api'
import type { ResourceTemplate, ResourceWidget, WidgetDefinition } from '../../types/admin'
import ResourceWidgetsEditor from './ResourceWidgetsEditor.vue'

vi.mock('../../api/admin-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/admin-api')>()),
  adminRequest: vi.fn(),
  adminRequestVoid: vi.fn(),
}))

const requestMock = vi.mocked(adminRequest)
const template: ResourceTemplate = {
  code: 'page',
  label: 'Page',
  icon: 'document',
	fields: [],
	editor_tabs: [],
  supports_resource_widgets: true,
	widget_value_sources: [], widget_areas: [{ code: 'body', label: 'Body', admin_span: 16, supports_resource_widgets: true, items: [{ kind: 'resource_widgets' }] }, { code: 'sidebar', label: 'Sidebar', admin_span: 8, supports_resource_widgets: true, items: [{ kind: 'resource_widgets' }] }],
}
const definition: WidgetDefinition = {
  code: 'core_content',
  module_code: 'core',
  module_label: 'Core',
  module_description: '',
  label: 'Content',
  description: '',
  fields: [],
  editor_tabs: [],
  summary_fields: [], param_types: {},
  views: [],
}
const widget = (id: number, area: 'body' | 'sidebar', position: number): ResourceWidget => ({
  id,
  code: 'core_content',
  area,
  position,
  view: 'default',
  columns: 12,
  margin_top: 0,
  margin_bottom: 0,
  enabled: true,
  params: {}, param_bindings: {},
})

function dragTransfer(): DataTransfer {
  const data = new Map<string, string>()
  const types: string[] = []
  return {
    dropEffect: 'none',
    effectAllowed: 'uninitialized',
    files: [],
    items: [],
    types,
    getData: (type: string) => data.get(type) ?? '',
    setData: (type: string, value: string) => {
      data.set(type, value)
      if (!types.includes(type)) types.push(type)
    },
  } as unknown as DataTransfer
}

function mountEditor(
  items: ResourceWidget[],
  canUpdate = true,
  options: { template?: ResourceTemplate; definitions?: WidgetDefinition[] } = {},
) {
  return mount(ResourceWidgetsEditor, {
    props: {
      accessToken: 'token',
      siteId: 7,
      resourceId: 9,
      template: options.template ?? template,
      definitions: options.definitions ?? [definition],
      modelValue: items,
      canUpdate,
    },
    global: {
      stubs: {
        WidgetPickerDialog: true,
        WidgetSettingsDialog: true,
      },
    },
  })
}

describe('ResourceWidgetsEditor drag and drop', () => {
  beforeEach(() => requestMock.mockReset())

  it('retains the dialog and draft after validation and clears it on retry or editor change', async () => {
    const source = widget(41, 'body', 0)
    const wrapper = mountEditor([source])
    const dialog = wrapper.getComponent({ name: 'WidgetSettingsDialog' })
    wrapper.getComponent({ name: 'WidgetCard' }).vm.$emit('edit', source)
    await flushPromises()
    const errors = [{ key: 'name', code: 'regex' }]
    requestMock.mockRejectedValueOnce(new AdminAPIError(422, 'validation_failed', 'request data is invalid', errors))
    const payload = { view: 'default', columns: 12, margin_top: 0, margin_bottom: 0, enabled: true, params: { name: 'draft' }, param_bindings: {} }
    dialog.vm.$emit('save', payload)
    await flushPromises()
    expect(dialog.props('modelValue')).toBe(true)
    expect(dialog.props('serverErrors')).toEqual(errors)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(JSON.parse(String(requestMock.mock.calls[0]?.[2]?.body)).params).toEqual({ name: 'draft' })
    dialog.vm.$emit('clearValidation')
    await flushPromises()
    expect(dialog.props('serverErrors')).toBeNull()
    requestMock.mockResolvedValueOnce({ ...source, params: { name: 'fixed' } })
    dialog.vm.$emit('save', { ...payload, params: { name: 'fixed' } })
    await flushPromises()
    expect(dialog.props('modelValue')).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    wrapper.unmount()
  })

  it('starts only from the handle and highlights the exact empty-area target', async () => {
    const wrapper = mountEditor([widget(41, 'body', 0)])
    const transfer = dragTransfer()
    const card = wrapper.find('.widget-card')
    const handle = wrapper.find('.widget-drag-handle')

    expect(card.attributes('draggable')).toBeUndefined()
    expect(handle.attributes('draggable')).toBe('true')
    await handle.trigger('dragstart', { dataTransfer: transfer })

    expect(transfer.types).toContain('application/x-go-cms-widget')
    expect(card.classes()).toContain('is-dragging')
    expect(wrapper.findAll('.widget-area.is-drag-available')).toHaveLength(1)

    const target = wrapper.find('.widget-empty-drop-target')
    await target.trigger('dragenter', { dataTransfer: transfer })
    expect(target.classes()).toContain('is-active')
    expect(target.element.closest('.widget-area')?.classList.contains('is-drop-area')).toBe(true)

    await handle.trigger('dragend', { dataTransfer: transfer })
    expect(card.classes()).not.toContain('is-dragging')
    expect(target.classes()).not.toContain('is-active')
  })

  it('locks duplicate drops while a cross-area reorder is being saved', async () => {
    let resolveRequest: ((value: { items: ResourceWidget[] }) => void) | undefined
    requestMock.mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve }))
    const source = [widget(41, 'body', 0), widget(42, 'body', 1)]
    const result = [widget(42, 'body', 0), widget(41, 'sidebar', 0)]
    const wrapper = mountEditor(source)
    const transfer = dragTransfer()

    await wrapper.findAll('.widget-drag-handle')[0]!.trigger('dragstart', { dataTransfer: transfer })
    const target = wrapper.find('.widget-empty-drop-target')
    await target.trigger('dragenter', { dataTransfer: transfer })
    await target.trigger('drop', { dataTransfer: transfer })
    await target.trigger('drop', { dataTransfer: transfer })

    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(
      '/api/sites/7/resources/9/widgets/order',
      'token',
      {
        method: 'PUT',
        body: JSON.stringify({ expected_version: 1, items: [
          { id: 42, area: 'body', position: 0 },
          { id: 41, area: 'sidebar', position: 0 },
        ] }),
      },
    )
    expect(wrapper.findAll('.widget-area.is-reordering')).toHaveLength(2)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([result])

    resolveRequest?.({ items: result })
    await flushPromises()
    expect(wrapper.find('.widget-area.is-reordering').exists()).toBe(false)
  })

  it('rolls back the optimistic order when persistence fails', async () => {
    requestMock.mockRejectedValueOnce(new Error('network down'))
    const source = [widget(41, 'body', 0), widget(77, 'sidebar', 0)]
    const wrapper = mountEditor(source)
    const transfer = dragTransfer()

    await wrapper.findAll('.widget-drag-handle')[0]!.trigger('dragstart', { dataTransfer: transfer })
    const sidebarTargets = wrapper.findAll('.widget-drop-target')
      .filter((target) => target.element.closest('.widget-area')?.querySelector('h3')?.textContent === 'Sidebar')
    await sidebarTargets[0]!.trigger('dragenter', { dataTransfer: transfer })
    await sidebarTargets[0]!.trigger('drop', { dataTransfer: transfer })
    await flushPromises()

    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates).toHaveLength(2)
    expect(updates[1]).toEqual([source])
  })

  it('disables handle dragging without update permission', () => {
    const wrapper = mountEditor([widget(41, 'body', 0)], false)
    expect(wrapper.find('.widget-drag-handle').attributes('draggable')).toBe('false')
    expect(wrapper.find('.widget-area.is-drag-available').exists()).toBe(false)
  })
})

describe('template widgets', () => {
  const staticDefinition = (code: string, label: string): WidgetDefinition => ({
    ...definition,
    code,
    label,
    description: `${label} description`,
  })

  it('renders static widgets in template order around the editable resource slot', () => {
    const orderedTemplate = {
      ...template,
      widget_areas: [{
        ...template.widget_areas[0]!,
        items: [
          { kind: 'widget' as const, code: 'header' },
          { kind: 'resource_widgets' as const },
          { kind: 'widget' as const, code: 'footer' },
        ],
      }],
    }
    const wrapper = mountEditor([widget(41, 'body', 0)], true, {
      template: orderedTemplate,
      definitions: [definition, staticDefinition('header', 'Header'), staticDefinition('footer', 'Footer')],
    })
    const area = wrapper.get('[data-area="body"]')

    expect([...area.element.querySelectorAll('.template-widget-card, .widget-card')]
      .map((card) => card.querySelector('strong')?.textContent)).toEqual(['Header', 'Content', 'Footer'])
    expect(area.findAll('.template-widget-card').map((card) => card.text())).toEqual([
      'HeaderHeader description', 'FooterFooter description',
    ])
    expect(area.find('.template-widget-card button').exists()).toBe(false)
    expect(area.find('.template-widget-card .widget-drag-handle').exists()).toBe(false)
    expect(area.findAll('.widget-drop-target')).toHaveLength(2)
    wrapper.unmount()
  })

  it('keeps repeated static widget codes as separate cards and supports a static-only area', () => {
    const staticOnlyTemplate = {
      ...template,
      widget_areas: [{
        ...template.widget_areas[0]!,
        supports_resource_widgets: false,
        items: [
          { kind: 'widget' as const, code: 'header' },
          { kind: 'widget' as const, code: 'header' },
        ],
      }],
    }
    const wrapper = mountEditor([], true, {
      template: staticOnlyTemplate,
      definitions: [staticDefinition('header', 'Header')],
    })
    const area = wrapper.get('[data-area="body"]')

    expect(area.findAll('.template-widget-card')).toHaveLength(2)
    expect(area.findAll('.template-widget-card strong').map((node) => node.text())).toEqual(['Header', 'Header'])
    expect(area.find('.widget-card').exists()).toBe(false)
    expect(area.find('.widget-empty-drop-target').exists()).toBe(false)
    expect(area.find('.widget-drop-target').exists()).toBe(false)
    expect(area.text()).not.toContain('В разделе нет виджетов')
    wrapper.unmount()
  })

  it('shows the empty message and drop target when an area has no static widgets', () => {
    const wrapper = mountEditor([])
    const area = wrapper.get('[data-area="body"]')

    expect(area.find('.template-widget-card').exists()).toBe(false)
    expect(area.find('.widget-empty-drop-target').exists()).toBe(true)
    expect(area.text()).toContain('В разделе нет виджетов')
    wrapper.unmount()
  })
})

it('retains default until the last widget move succeeds and preserves declared empty areas', async () => {
  const source = [{ ...widget(41, 'body', 0), area: 'default' }]
  const wrapper = mountEditor(source)
  await wrapper.setProps({ template: { ...template, widget_areas: [] }, modelValue: [] })
  expect(wrapper.get('[data-area="default"]').text()).toContain('Страница сайта')
  expect(wrapper.findAll('.widget-area')).toHaveLength(1)
  const zones = ['main', 'aside', 'footer'].map((code) => ({ code, label: code, admin_span: 24, supports_resource_widgets: true, items: [{ kind: 'resource_widgets' as const }] }))
  await wrapper.setProps({ template: { ...template, widget_areas: zones }, modelValue: source })
  expect(wrapper.findAll('.widget-area').map((node) => node.attributes('data-area'))).toEqual(['main', 'aside', 'footer', 'default'])
  let resolveRequest: ((value: { items: ResourceWidget[] }) => void) | undefined
  requestMock.mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve }))
  const transfer = dragTransfer()
  await wrapper.get('.widget-drag-handle').trigger('dragstart', { dataTransfer: transfer })
  await wrapper.get('[data-area="main"] .widget-empty-drop-target').trigger('drop', { dataTransfer: transfer })
  const moved = wrapper.emitted('update:modelValue')!.at(-1)![0] as ResourceWidget[]
  await wrapper.setProps({ modelValue: moved })
  expect(wrapper.find('[data-area="default"]').exists()).toBe(true)
  resolveRequest?.({ items: moved })
  await flushPromises()
  expect(wrapper.find('[data-area="default"]').exists()).toBe(false)
  expect(wrapper.findAll('.widget-area')).toHaveLength(3)
  wrapper.unmount()
})

it('shows recovered disabled bindings and restores them when their declared area returns', async () => {
  const source = [{ ...widget(41, 'body', 0), area: 'removed', enabled: false }]
  const wrapper = mountEditor(source)
  expect(wrapper.find('[data-area="default"] .widget-card').exists()).toBe(true)
  await wrapper.setProps({ template: { ...template, widget_areas: [...template.widget_areas, { code: 'removed', label: 'Returned', admin_span: 24, supports_resource_widgets: true, items: [{ kind: 'resource_widgets' }] }] } })
  expect(wrapper.find('[data-area="default"]').exists()).toBe(false)
  expect(wrapper.find('[data-area="removed"] .widget-card').exists()).toBe(true)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  wrapper.unmount()
})
