// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AdminAPIError } from '../../api/admin-api'
import { fieldErrorMessage } from './model'
import ServerValidationErrors from './ServerValidationErrors.vue'
import { serverValidationMessages, useServerValidation, validationFieldLabel } from './server-validation'

const fields = [{ key: 'contacts', label: 'Контакты', options: { fields: [
  { key: 'name', label: 'Имя' },
  { key: 'phones', label: 'Телефоны' },
] } }]

describe('server validation summary', () => {
  it('resolves nested labels and one-based list positions without changing the API key', () => {
    expect(validationFieldLabel('contacts[0].phones[2]', fields)).toBe('Контакты → Элемент 1 → Телефоны → Элемент 3')
    const errors = [{ key: 'contacts[1].name', code: 'max_length', params: { value: 100 } }]
    expect(serverValidationMessages(errors, fields)).toEqual(['Контакты → Элемент 2 → Имя: Максимум символов: 100.'])
    expect(errors[0]!.key).toBe('contacts[1].name')
  })

  it('keeps unknown field paths useful and hides custom validator codes', () => {
    expect(serverValidationMessages([{ key: 'missing[0].child', code: 'secret.custom' }], fields))
      .toEqual(['missing → Элемент 1 → child: Значение не прошло проверку.'])
    expect(validationFieldLabel('', fields)).toBe('Поле')
  })

  it('renders multiple errors as text, supports empty-details errors and clears on retry', async () => {
    const state = useServerValidation()
    const original = [{ key: 'contacts[0].name', code: 'required' }, { key: '<script>', code: 'custom' }]
    expect(state.capture(new AdminAPIError(422, 'validation_failed', 'Internal validation error', original))).toBe(true)
    expect(state.errors.value).toEqual(original)
    const wrapper = mount(ServerValidationErrors, { props: { errors: state.errors.value, message: state.message.value, fields } })
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Имя: Поле обязательно.')
    expect(wrapper.text()).toContain('Internal validation error')
    expect(wrapper.find('script').exists()).toBe(false)
    state.clear()
    await wrapper.setProps({ errors: state.errors.value })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    state.capture(new AdminAPIError(422, 'validation_failed', 'Forms validation failed'))
    await wrapper.setProps({ errors: state.errors.value, message: state.message.value })
    expect(wrapper.text()).toContain('Forms validation failed')
    wrapper.unmount()
  })

  it.each([401, 403, 409, 500])('leaves HTTP %s handling to its caller', status => {
    const state = useServerValidation()
    expect(state.capture(new AdminAPIError(status, 'validation_failed', 'error'))).toBe(false)
    expect(state.errors.value).toBeNull()
  })

  it('leaves network and non-validation failures to the caller', () => {
    const state = useServerValidation()
    expect(state.capture(new Error('offline'))).toBe(false)
    expect(state.capture(new AdminAPIError(422, 'another_error', 'failure'))).toBe(false)
    expect(state.errors.value).toBeNull()
  })

  it('keeps a bounded, plain-text server message with structured field errors', () => {
    const state = useServerValidation()
    const detail = `Неподдерживаемый MIME\n${'<x>'.repeat(300)}`
    expect(state.capture(new AdminAPIError(422, 'validation_failed', detail, [{ key: 'logo', code: 'custom.mime' }]))).toBe(true)
    expect(state.errors.value).toEqual([{ key: 'logo', code: 'custom.mime' }])
    expect(state.message.value).toHaveLength(500)
    const wrapper = mount(ServerValidationErrors, { props: { errors: state.errors.value, message: state.message.value, fields } })
    expect(wrapper.text()).toContain('Неподдерживаемый MIME')
    expect(wrapper.find('x').exists()).toBe(false)
    expect(wrapper.findAll('li')).toHaveLength(1)
  })

  it.each([
    'min', 'max', 'between', 'multiple_of', 'digits', 'min_digits', 'max_digits', 'digits_between',
    'min_length', 'max_length', 'length', 'length_between', 'alpha', 'alpha_dash', 'alpha_numeric',
    'ascii', 'lowercase', 'uppercase', 'starts_with', 'ends_with', 'doesnt_start_with', 'doesnt_end_with',
    'contains', 'doesnt_contain', 'regex', 'not_regex', 'in', 'not_in', 'min_items', 'max_items',
    'items_between', 'items_count', 'unique_items', 'url', 'ip', 'ipv4', 'ipv6', 'mac', 'uuid', 'ulid',
    'hex_color', 'accepted', 'declined',
  ])('has a human-readable message for builtin %s', code => {
    const message = fieldErrorMessage(code, { value: 0, min: 0, max: 10, values: ['x'] })
    expect(message).not.toBe('Значение не прошло проверку.')
    expect(message).not.toContain('undefined')
  })
})
