// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import { adminRequest } from '../../api/admin-api'
import LibrarySourcePickerField from './LibrarySourcePickerField.vue'

vi.mock('../../api/admin-api', () => ({ adminRequest: vi.fn() }))
const request = vi.mocked(adminRequest)
beforeEach(() => { request.mockReset() })

it('restores the saved source and lets the editor select a library on another site', async () => {
  request.mockImplementation(async (path) => {
    if (path.startsWith('/api/sites?')) return { items: [{ id: 3, name: 'Другой сайт', domain: 'other.test' }], pagination: { total: 1 } } as never
    if (path.includes('selected_id=10')) return { items: [{ id: 10, site_id: 2, site_name: 'Источник', domain: 'source.test', title: 'Source', path: '/source' }], pagination: { total: 1 } } as never
    return { items: [{ id: 30, site_id: 3, site_name: 'Другой сайт', domain: 'other.test', title: 'Other', path: '/other' }], pagination: { total: 1 } } as never
  })
  const wrapper = shallowMount(LibrarySourcePickerField, { global: { renderStubDefaultSlot: true }, props: { modelValue: 10, siteId: 7, accessToken: 'token', 'onUpdate:modelValue': (value) => { void wrapper.setProps({ modelValue: value }) } } })
  await flushPromises()
  const selects = wrapper.findAllComponents({ name: 'ElSelect' })
  expect(selects[0]!.props('modelValue')).toBe(2)
  expect(wrapper.findAllComponents({ name: 'ElOption' }).some(option => option.props('label') === 'Источник')).toBe(true)
  expect(selects[1]!.props('modelValue')).toBe(10)
  selects[0]!.vm.$emit('update:modelValue', 3)
  selects[0]!.vm.$emit('change', 3)
  await flushPromises()
  expect(selects[1]!.props('modelValue')).toBeUndefined()
  expect(request).toHaveBeenCalledWith(expect.stringContaining('source_site_id=3'), 'token')
  selects[1]!.vm.$emit('update:modelValue', 30)
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([30])
})

it('ignores a stale library response after changing source site', async () => {
  let resolveOld: (value: unknown) => void = () => {}
  request.mockResolvedValue({ items: [], pagination: { total: 0 } } as never)
  const wrapper = shallowMount(LibrarySourcePickerField, { global: { renderStubDefaultSlot: true }, props: { siteId: 7, accessToken: 'token' } })
  await flushPromises()
  request.mockImplementation(async (path) => path.includes('source_site_id=2') ? await new Promise<unknown>(resolve => { resolveOld = resolve }) as never : { items: [{ id: 30, site_id: 3, title: 'Current', path: '/current' }], pagination: { total: 1 } } as never)
  const select = wrapper.findAllComponents({ name: 'ElSelect' })[0]!
  select.vm.$emit('update:modelValue', 2); select.vm.$emit('change', 2)
  await flushPromises()
  select.vm.$emit('update:modelValue', 3); select.vm.$emit('change', 3)
  await flushPromises()
  resolveOld({ items: [{ id: 10, site_id: 2, title: 'Stale' }], pagination: { total: 1 } })
  await flushPromises()
  const options = wrapper.findAllComponents({ name: 'ElOption' }).map(option => option.props('value'))
  expect(options).toContain(30)
  expect(options).not.toContain(10)
})
