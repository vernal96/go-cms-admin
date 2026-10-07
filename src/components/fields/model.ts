import type { Component } from 'vue'
import type { FieldDefinition } from '../../types/admin'

export type DynamicValues = Record<string, unknown>
export type DynamicFieldErrors = Record<string, string>

const supportedTypes = new Set([
  'string',
  'int',
  'float',
  'checkbox',
  'radio',
  'select',
  'textarea',
  'email',
  'phone',
  'file',
  'media',
  'repeater',
	'json',
])

export function isMultipleField(field: FieldDefinition): boolean {
  return field.options?.multiple === true
}

export function validatorNumber(field: FieldDefinition, code: string): number {
  const value = Number((field.validators ?? []).find(item => item.type === code)?.options?.value)
  return Number.isFinite(value) && value >= 0 ? value : 0
}

const listValidatorCodes = new Set(['min_items', 'max_items', 'items_between', 'items_count', 'unique_items', 'contains', 'doesnt_contain'])

export function singleValueField(field: FieldDefinition): FieldDefinition {
  return { ...field, required: true, validators: (field.validators ?? []).filter(item => !listValidatorCodes.has(item.type)), options: { ...field.options, multiple: false } }
}

export interface FieldEditorResolver {
  fieldEditor(code: string): Component | undefined
}

const standardEditors = new Set([...supportedTypes, 'html', 'resource-template', 'resource-picker', 'resource-multi-picker', 'library-source-picker'])

export function fieldEditorError(field: FieldDefinition, resolver?: FieldEditorResolver): string | undefined {
  const code = field.editor || field.type
  if (field.editor && resolver?.fieldEditor(field.editor)) return undefined
  if (field.editor ? standardEditors.has(code) : supportedTypes.has(code)) return undefined
  return field.editor ? `Редактор «${code}» недоступен.` : `Тип поля «${code}» не поддерживается.`
}

export function unsupportedFieldTypes(fields: FieldDefinition[], resolver?: FieldEditorResolver): string[] {
  return fields.flatMap(field => {
    if (fieldEditorError(field, resolver)) return [`${field.key} (${field.editor || field.type})`]
    if ((field.editor || field.type) !== 'repeater') return []
    return unsupportedFieldTypes(field.options?.fields ?? [], resolver).map(message => `${field.key}[].${message}`)
  })
}

export function createFieldValues(
  fields: FieldDefinition[],
  source: DynamicValues = {},
): DynamicValues {
  const result: DynamicValues = {}
  for (const field of fields) {
    const type = supportedTypes.has(field.editor ?? '') ? field.editor : field.type
    if (Object.hasOwn(source, field.key)) {
      result[field.key] = source[field.key]
    } else if (isMultipleField(field)) {
      result[field.key] = []
    } else if (type === 'checkbox') {
      result[field.key] = false
    } else if (type === 'select' && field.options?.multiple) {
      result[field.key] = []
    } else if (type === 'int' || type === 'float') {
      result[field.key] = null
    } else if (type === 'file' || type === 'media') {
      result[field.key] = null
		} else if (type === 'json' || type === 'repeater') {
			result[field.key] = []
    } else {
      result[field.key] = ''
    }
  }
  return result
}

export function validateFieldValues(
  fields: FieldDefinition[],
  values: DynamicValues,
  resolver?: FieldEditorResolver,
): DynamicFieldErrors {
  const errors: DynamicFieldErrors = {}
  for (const field of fields) {
    const unavailable = fieldEditorError(field, resolver)
    if (unavailable) {
      errors[field.key] = unavailable
      continue
    }

    if ((field.editor || field.type) === 'repeater') {
      for (const unavailable of unsupportedFieldTypes(field.options?.fields ?? [], resolver)) {
        errors[`${field.key}[]`] = `Недоступно поле: ${unavailable}.`
      }
    }
    const value = values[field.key]
    if (isMultipleField(field)) {
      const minimum = field.required ? 1 : 0
      if (value !== null && value !== undefined && !Array.isArray(value)) {
        errors[field.key] = 'Ожидается список значений.'
        continue
      }
      const items: unknown[] = Array.isArray(value) ? value : []
      if (items.length < minimum) errors[field.key] = 'Поле обязательно.'
      for (const validator of field.validators ?? []) {
        if (!listValidatorCodes.has(validator.type)) continue
        const message = clientValidatorMessage(validator.type, validator.options, items)
        if (message) { errors[field.key] = message; break }
      }
      const seen = new Set<unknown>()
      for (const [index, item] of items.entries()) {
        const key = `${field.key}[${index}]`
        Object.assign(errors, validateFieldValues([{ ...singleValueField(field), key }], { [key]: item }, resolver))
        if (field.type === 'select' && seen.has(item)) errors[key] = fieldErrorMessage('unique')
        seen.add(item)
      }
      continue
    }
    if (field.type === 'repeater' && Array.isArray(value)) {
      for (const [index, row] of value.entries()) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          errors[`${field.key}[${index}]`] = 'Ожидается запись.'
          continue
        }
        for (const [key, error] of Object.entries(validateFieldValues(field.options?.fields ?? [], row as DynamicValues, resolver))) errors[`${field.key}[${index}].${key}`] = error
      }
    }
    const empty = isEmpty(value)
    if (field.required && empty) {
      errors[field.key] = 'Поле обязательно.'
      continue
    }
    if (empty && !Array.isArray(value)) continue

    if ((field.type === 'select' || field.type === 'radio') && !field.options?.choices?.some(choice => choice.value === value)) {
      errors[field.key] = fieldErrorMessage('oneof')
      continue
    }
    if (
      field.type === 'email' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
    ) {
      errors[field.key] = 'Введите корректный адрес электронной почты.'
      continue
    }
    if (field.type === 'phone' && !/^\+[1-9][0-9]{1,14}$/.test(String(value))) {
      errors[field.key] = 'Введите телефон в формате E.164, например +79991234567.'
      continue
    }
    if (
      (field.type === 'int' || field.type === 'float') &&
      (typeof value !== 'number' || !Number.isFinite(value) || (field.type === 'int' && !Number.isInteger(value)))
    ) {
      errors[field.key] = 'Введите число.'
      continue
    }
    if ((field.type === 'file' || field.type === 'media') && (typeof value !== 'number' || !Number.isInteger(value) || value <= 0)) {
      errors[field.key] = field.type === 'media' ? 'Выберите изображение.' : 'Выберите файл.'
      continue
    }
		if (field.type === 'json' && !Array.isArray(value) && (typeof value !== 'object' || value === null)) {
			errors[field.key] = 'Введите JSON-массив или объект.'
			continue
		}

    for (const validator of field.validators ?? []) {
      const message = clientValidatorMessage(validator.type, validator.options, value)
      if (message) { errors[field.key] = message; break }
    }
  }
  return errors
}

export function fieldErrorMessage(code: string, params: Record<string, unknown> = {}): string {
  const value = params.value ?? ''
  switch (code) {
    case 'required': return 'Поле обязательно.'
    case 'defined': return 'Поле отсутствует в актуальной схеме.'
    case 'type': return 'Значение имеет неверный тип.'
    case 'email': return 'Введите корректный адрес электронной почты.'
    case 'e164': return 'Введите телефон в формате E.164, например +79991234567.'
    case 'pattern': case 'regex': return 'Значение не соответствует требуемому формату.'
    case 'oneof': case 'in': return 'Выбрано недопустимое значение.'
    case 'not_in': return 'Значение недопустимо.'
    case 'min_items': return `Минимум значений: ${value}.`
    case 'max_items': return `Максимум значений: ${value}.`
    case 'unique': case 'unique_items': return 'Значение уже выбрано.'
    case 'min': return `Минимальное значение: ${value}.`
    case 'max': return `Максимальное значение: ${value}.`
    case 'min_length': return `Минимум символов: ${value}.`
    case 'max_length': return `Максимум символов: ${value}.`
    case 'between': return `Значение должно быть от ${params.min} до ${params.max}.`
    case 'multiple_of': return `Значение должно быть кратно ${value}.`
    case 'digits': return `Количество цифр: ${value}.`
    case 'min_digits': return `Минимум цифр: ${value}.`
    case 'max_digits': return `Максимум цифр: ${value}.`
    case 'digits_between': return `Количество цифр должно быть от ${params.min} до ${params.max}.`
    case 'length': return `Количество символов: ${value}.`
    case 'length_between': return `Количество символов должно быть от ${params.min} до ${params.max}.`
    case 'items_count': return `Количество значений: ${value}.`
    case 'items_between': return `Количество значений должно быть от ${params.min} до ${params.max}.`
    case 'alpha': return 'Допустимы только буквы.'
    case 'alpha_dash': return 'Допустимы только буквы, цифры, дефис и подчёркивание.'
    case 'alpha_numeric': return 'Допустимы только буквы и цифры.'
    case 'ascii': return 'Допустимы только символы ASCII.'
    case 'lowercase': return 'Используйте нижний регистр.'
    case 'uppercase': return 'Используйте верхний регистр.'
    case 'starts_with': return `Значение должно начинаться с «${value}».`
    case 'ends_with': return `Значение должно заканчиваться на «${value}».`
    case 'doesnt_start_with': return `Значение не должно начинаться с «${value}».`
    case 'doesnt_end_with': return `Значение не должно заканчиваться на «${value}».`
    case 'contains': return 'Добавьте хотя бы одно из требуемых значений или фрагментов текста.'
    case 'doesnt_contain': return 'Обнаружены запрещённые значения или фрагменты текста.'
    case 'not_regex': return 'Значение соответствует запрещённому формату.'
    case 'url': return 'Введите корректный URL.'
    case 'ip': return 'Введите корректный IP-адрес.'
    case 'ipv4': return 'Введите корректный IPv4-адрес.'
    case 'ipv6': return 'Введите корректный IPv6-адрес.'
    case 'mac': return 'Введите корректный MAC-адрес.'
    case 'uuid': return 'Введите корректный UUID.'
    case 'ulid': return 'Введите корректный ULID.'
    case 'hex_color': return 'Введите цвет в формате HEX, например #ff0000.'
    case 'accepted': return 'Необходимо подтвердить согласие.'
    case 'declined': return 'Значение должно быть отключено.'
    default: return 'Значение не прошло проверку.'
  }
}

function clientValidatorMessage(code: string, options: Record<string, unknown> | undefined, value: unknown): string | undefined {
  const limit = Number(options?.value)
  if (code === 'min' && typeof value === 'number' && Number.isFinite(limit) && value < limit) return fieldErrorMessage(code, options)
  if (code === 'max' && typeof value === 'number' && Number.isFinite(limit) && value > limit) return fieldErrorMessage(code, options)
  if (code === 'min_length' && typeof value === 'string' && Number.isFinite(limit) && [...value].length < limit) return fieldErrorMessage(code, options)
  if (code === 'max_length' && typeof value === 'string' && Number.isFinite(limit) && [...value].length > limit) return fieldErrorMessage(code, options)
  if (code === 'min_items' && Array.isArray(value) && Number.isFinite(limit) && value.length < limit) return fieldErrorMessage(code, options)
  if (code === 'max_items' && Array.isArray(value) && Number.isFinite(limit) && value.length > limit) return fieldErrorMessage(code, options)
  if (code === 'in' && Array.isArray(options?.values) && !options.values.includes(value)) return fieldErrorMessage(code, options)
  if (code === 'not_in' && Array.isArray(options?.values) && options.values.includes(value)) return fieldErrorMessage(code, options)
  return undefined
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}
