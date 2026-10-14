// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import DynamicField from './DynamicField.vue'
import FilePickerDialog from '../files/FilePickerDialog.vue'
import MediaField from './MediaField.vue'
import { adminAccessTokenKey, adminPermissionsKey } from '../../admin-context'
import { createFieldValues, unsupportedFieldTypes, validateFieldValues } from './model'
const field = { key: 'page_media', label: 'Медиа', type: 'media', editor: 'media', required: false, validators: [] }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('routes the media field type to the shared tile editor', async () => {
 const fetcher = vi.fn(async (url: string) => {
  if (url === '/api/media') return new Response(JSON.stringify({ id: 77 }))
  if (url.includes('/image')) return new Response(JSON.stringify({ editable: true, current_file: { id: 9 } }))
  return new Response('image')
 })
 vi.stubGlobal('fetch', fetcher)
 vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:media'), revokeObjectURL: vi.fn() })
 const wrapper = mount(DynamicField, { props: { field, modelValue: 31 }, global: { provide: { [adminAccessTokenKey as symbol]: ref('token'), [adminPermissionsKey as symbol]: ref(new Set(['core.media.create','core.media.update','core.file.read','core.file.create'])) }, stubs: { FilePickerDialog: true, ImageEditor: true } } })
 await flushPromises()
 expect(wrapper.findComponent(MediaField).exists()).toBe(true)
 wrapper.findComponent(FilePickerDialog).vm.$emit('select', { id: 9 })
 await flushPromises()
 expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([77])
 wrapper.unmount()
})
it('allows an empty optional Media field and rejects non-reference values', () => {
 expect(createFieldValues([field])).toEqual({ page_media: null })
 expect(validateFieldValues([field], { page_media: null })).toEqual({})
 expect(validateFieldValues([field], { page_media: { file_id: 9 } })).toHaveProperty('page_media')
})
it('no longer treats file as a dynamic field type', () => {
 expect(unsupportedFieldTypes([{ key: 'legacy_file', type: 'file', label: 'File', required: false, validators: [] } as never])).toEqual(['legacy_file (file)'])
})
