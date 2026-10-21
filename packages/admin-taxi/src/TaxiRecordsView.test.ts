// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSelectedSite } from '@go-cms/admin/sdk'
import * as api from './api'
import TaxiRecordsView from './TaxiRecordsView.vue'

vi.mock('./api', () => ({
  createTaxiRecord: vi.fn(),
  deleteTaxiRecord: vi.fn(),
  listTaxiRecords: vi.fn(),
  updateTaxiRecord: vi.fn(),
}))

afterEach(() => {
  useSelectedSite().reset()
  vi.clearAllMocks()
})

describe('TaxiRecordsView', () => {
  it('shows inline required-field errors without sending an empty record', async () => {
    useSelectedSite().setSelected({ id: 7, name: 'Example', domain: 'example.test' })
    vi.mocked(api.listTaxiRecords).mockResolvedValue({
      items: [],
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 0,
    })

    const wrapper = mount(TaxiRecordsView, {
      props: {
        accessToken: 'token',
        permissions: new Set(['taxi.record.read', 'taxi.record.create']),
      },
      global: {
        stubs: {
          ElAlert: { template: '<div><slot /></div>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElDialog: {
            props: ['modelValue'],
            template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
          },
          ElFormItem: {
            props: ['label', 'error'],
            template: `
              <div class="el-form-item">
                <label>{{ label }}</label>
                <span v-if="error" class="field-error">{{ error }}</span>
                <slot />
              </div>
            `,
          },
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue', 'input'],
            template: `
              <input
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value); $emit('input', $event.target.value)"
              />
            `,
          },
        },
      },
    })
    await flushPromises()

    const addButton = wrapper.findAll('button').find((button) => button.text().includes('Добавить запись'))
    expect(addButton).toBeDefined()
    await addButton!.trigger('click')
    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Сохранить'))
    expect(saveButton).toBeDefined()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.taxi-record-form .field-error').map((item) => item.text())).toEqual([
      'Укажите номер',
      'Укажите наименование',
    ])
    expect(api.createTaxiRecord).not.toHaveBeenCalled()
    expect(api.updateTaxiRecord).not.toHaveBeenCalled()
  })
})
