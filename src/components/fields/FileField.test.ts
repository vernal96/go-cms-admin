// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import FileField from './FileField.vue'
import FilePickerDialog from '../files/FilePickerDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ImageEditor from '../images/ImageEditor.vue'
import MediaSettingsDialog from '../images/MediaSettingsDialog.vue'
import { adminAccessTokenKey, adminPermissionsKey } from '../../admin-context'

const item = (id: number, name = `file-${id}.png`) => ({
  id, kind: 'file' as const, folder_id: null, source_file_id: null, storage: 'public', name,
  mime_type: 'image/png', size: 120, created_at: '', updated_at: '',
})
const props = { disk: 'public', virtualPath: 'site/logo', settingsCode: 'site_logo', modelValue: null as unknown }
const uploadContext = { endpoint: '/api/files/field-uploads', target: { owner: 'site', profile_code: 'ministry' } }
const mountField = (overrides = {}) => mount(FileField, {
  props: { ...props, ...overrides },
  global: { provide: {
    [adminAccessTokenKey as symbol]: ref('token'),
    [adminPermissionsKey as symbol]: ref(new Set(['core.file.read', 'core.file.create', 'core.file.delete', 'core.media.create', 'core.media.read', 'core.media.update', 'core.media.delete'])),
  } },
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('creates a distinct Media value after choosing a file and scopes the manager to its disk', async () => {
  const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ id: 71 })))
  vi.stubGlobal('fetch', fetcher)
  const wrapper = mountField()
  const picker = wrapper.findComponent(FilePickerDialog)
  expect(picker.props('storages')).toEqual(['public'])
  expect(picker.props('initialPath')).toBeUndefined()
  picker.vm.$emit('select', item(3))
  await flushPromises()
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/media')
  expect(JSON.parse((fetcher.mock.calls[0]?.[1] as RequestInit).body as string)).toEqual({ file_id: 3 })
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([71])
  wrapper.unmount()
})

it('hides server-backed actions when the matching Media permissions are missing', async () => {
  const wrapper = mount(FileField, {
    props,
    global: { provide: {
      [adminAccessTokenKey as symbol]: ref('token'),
      [adminPermissionsKey as symbol]: ref(new Set(['core.file.read', 'core.file.create', 'core.file.delete'])),
    } },
  })
  const buttons = wrapper.findAllComponents({ name: 'ElButton' })
  expect(buttons.find(button => button.text() === 'Выбрать файл')?.props('disabled')).toBe(true)
  expect(buttons.find(button => button.text() === 'Загрузить')?.props('disabled')).toBe(true)
  wrapper.unmount()
})

it('does not offer physical deletion without both file and Media delete permissions', async () => {
  const file = { ...item(2, 'document.pdf'), mime_type: 'application/pdf' }
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    id: 9, file, editable_image: false, updated_at: '2026-10-09T12:00:00Z',
  }))))
  const wrapper = mount(FileField, {
    props: { ...props, siteId: 8, modelValue: 9 },
    global: { provide: {
      [adminAccessTokenKey as symbol]: ref('token'),
      [adminPermissionsKey as symbol]: ref(new Set([
        'core.file.read', 'core.file.create', 'core.file.delete',
        'core.media.create', 'core.media.read', 'core.media.update',
      ])),
    } },
  })
  await flushPromises()
  await wrapper.find('.file-field-tile').trigger('contextmenu', { clientX: 0, clientY: 0 })
  expect(wrapper.findAll('.file-context-menu button').some(button => button.text() === 'Удалить совсем')).toBe(false)
  wrapper.unmount()
})

it('creates a Media per selected file, keeps multiple values in order, and supports tile drag reorder', async () => {
  let nextID = 20
  vi.stubGlobal('fetch', vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ id: nextID++ }))))
  const wrapper = mountField({ multiple: true, modelValue: [] })
  const picker = wrapper.findComponent(FilePickerDialog)
  expect(picker.props('multiple')).toBe(true)
  picker.vm.$emit('selectMultiple', [item(4), item(5)])
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[20, 21]])
  await wrapper.setProps({ modelValue: [20, 21] })
  await flushPromises()
  const tiles = wrapper.findAll('.file-field-tile')
  expect(tiles).toHaveLength(2)
  await tiles[0]!.trigger('dragstart')
  await tiles[1]!.trigger('drop')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[21, 20]])
  wrapper.unmount()
})

it('opens image editing and settings from a tile context menu', async () => {
  const image = { id: 2, kind: 'file', folder_id: null, source_file_id: null, storage: 'public', name: 'logo.png', mime_type: 'image/png' }
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/api/media/9' ? new Response(JSON.stringify({ id: 9, file: image, editable_image: true })) : new Response('image')))
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
  const wrapper = mountField({ siteId: 8, modelValue: 9 })
  await flushPromises()
  await wrapper.find('.file-field-tile').trigger('contextmenu', { clientX: 10, clientY: 12 })
  await wrapper.findAll('.file-context-menu button').find(button => button.text() === 'Редактирование')!.trigger('click')
  expect(wrapper.findComponent(ImageEditor).props('baseUrl')).toBe('/api/media/9/image')
  await wrapper.find('.file-field-tile').trigger('contextmenu', { clientX: 10, clientY: 12 })
  await wrapper.findAll('.file-context-menu button').find(button => button.text() === 'Мета данные')!.trigger('click')
  const dialog = wrapper.findComponent(MediaSettingsDialog)
  expect(dialog.props('mediaId')).toBe(9)
  expect(dialog.props('siteId')).toBe(8)
  expect(dialog.props('settingsCode')).toBe('site_logo')
  wrapper.unmount()
})

it('filters the selected file by MIME before creating Media', async () => {
  const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ id: 71 })))
  vi.stubGlobal('fetch', fetcher)
  const wrapper = mountField({ mimeTypes: ['image/png'] })
  wrapper.findComponent(FilePickerDialog).vm.$emit('select', { ...item(3), mime_type: 'image/jpeg' })
  await flushPromises()
  expect(fetcher).not.toHaveBeenCalled()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  wrapper.unmount()
})

it('uploads accepted MIME files using the owner-scoped endpoint and field path', async () => {
  const calls: Array<[string, RequestInit?]> = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push([url, init])
    if (url === '/api/files/field-uploads') return new Response(JSON.stringify(item(41)))
    if (url === '/api/media') return new Response(JSON.stringify({ id: 42 }))
    return new Response('')
  }))
  const wrapper = mountField({ mimeTypes: ['image/png'], uploadContext, referencePath: ['logo'] })
  const input = wrapper.find('input[type="file"]')
  const png = new File(['bytes'], 'mark.png', { type: 'image/png' })
  Object.defineProperty(input.element, 'files', { configurable: true, value: [png] })
  await input.trigger('change')
  await flushPromises()
  expect(calls[0]![0]).toBe('/api/files/field-uploads')
  const body = calls[0]![1]?.body as FormData
  expect(body).toBeInstanceOf(FormData)
  expect(JSON.parse(body.get('target') as string)).toEqual({ owner: 'site', profile_code: 'ministry', field_path: ['logo'] })
  expect(body.get('file')).toBeInstanceOf(File)
  expect(calls[1]![0]).toBe('/api/media')
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([42])
  wrapper.unmount()
})

it('disables upload when an owner-scoped target is unavailable', () => {
  const wrapper = mountField()
  expect(wrapper.findAllComponents({ name: 'ElButton' }).find(button => button.text() === 'Загрузить')?.props('disabled')).toBe(true)
  wrapper.unmount()
})

it('rejects a disallowed upload in the browser before making an API request', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  const wrapper = mountField({ mimeTypes: ['image/png'] })
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['bytes'], 'notes.txt', { type: 'text/plain' })] })
  await input.trigger('change')
  await flushPromises()
  expect(fetcher).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('confirms permanent removal using file and Media version preconditions', async () => {
  const confirm = vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
  const file = item(2, 'mark.png')
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/media/9') return new Response(JSON.stringify({ id: 9, file, editable_image: false, updated_at: '2026-10-09T12:00:00Z' }))
    if (url.endsWith('/delete-file') && init?.method === 'POST') return new Response(JSON.stringify({ operation_id: 'op-1', status: 'completed', status_url: '/api/sites/8/media-file-deletions/op-1' }))
    return new Response(JSON.stringify({}))
  })
  vi.stubGlobal('fetch', fetcher)
  const wrapper = mountField({ siteId: 8, modelValue: 9 })
  await flushPromises()
  await wrapper.find('.file-field-tile').trigger('contextmenu', { clientX: 0, clientY: 0 })
  await wrapper.findAll('.file-context-menu button').find(button => button.text() === 'Удалить совсем')!.trigger('click')
  await flushPromises()
  expect(confirm).toHaveBeenCalled()
  const deletion = fetcher.mock.calls.find(([url]) => url === '/api/sites/8/media/9/delete-file')
  expect(deletion?.[1]?.method).toBe('POST')
  expect(JSON.parse(deletion?.[1]?.body as string)).toEqual({ expected_file_id: 2, expected_updated_at: '2026-10-09T12:00:00Z' })
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  wrapper.unmount()
})

it('keeps a pending-delete tile until authenticated status polling reports completion', async () => {
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
  const file = item(2, 'mark.png')
  const fetcher = vi.fn(async (url: string) => {
    if (url === '/api/media/9') return new Response(JSON.stringify({ id: 9, file, editable_image: false, updated_at: 'version-1' }))
    if (url.endsWith('/delete-file')) return new Response(JSON.stringify({ operation_id: 'op-1', status: 'pending', status_url: '/api/sites/8/media-file-deletions/op-1' }), { status: 202 })
    if (url === '/api/sites/8/media-file-deletions/op-1') return new Response(JSON.stringify({ operation_id: 'op-1', status: 'completed' }))
    return new Response(JSON.stringify({}))
  })
  vi.stubGlobal('fetch', fetcher)
  const wrapper = mountField({ siteId: 8, modelValue: 9 })
  await flushPromises()
  await wrapper.find('.file-field-tile').trigger('contextmenu', { clientX: 0, clientY: 0 })
  await wrapper.findAll('.file-context-menu button').find(button => button.text() === 'Удалить совсем')!.trigger('click')
  await flushPromises()
  expect(fetcher.mock.calls.map(([url]) => url)).toContain('/api/sites/8/media-file-deletions/op-1')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  wrapper.unmount()
})

it.each([
  ['media_file_in_use', 'Файл используется в других местах'],
  ['media_file_delete_conflict', 'Медиа изменилось после загрузки'],
])('shows a localized message for server deletion conflict %s', async (code, expected) => {
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
  const error = vi.spyOn(ElMessage, 'error').mockImplementation(() => '' as never)
  const file = item(2, 'mark.png')
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/media/9') return new Response(JSON.stringify({ id: 9, file, editable_image: false, updated_at: 'version-1' }))
    if (url.endsWith('/delete-file') && init?.method === 'POST') return new Response(JSON.stringify({ error: { code, message: 'backend message' } }), { status: 409 })
    return new Response(JSON.stringify({}))
  }))
  const wrapper = mountField({ siteId: 8, modelValue: 9 })
  await flushPromises()
  await wrapper.find('.file-field-tile').trigger('contextmenu', { clientX: 0, clientY: 0 })
  await wrapper.findAll('.file-context-menu button').find(button => button.text() === 'Удалить совсем')!.trigger('click')
  await flushPromises()
  expect(error).toHaveBeenCalledWith(expect.stringContaining(expected))
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  wrapper.unmount()
})
