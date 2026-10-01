import { describe, expect, it } from 'vitest'

import type { FieldDefinition } from '../../types/admin'
import {
  createFieldValues,
  fieldErrorMessage,
  unsupportedFieldTypes,
  validateFieldValues,
} from './model'

const fields: FieldDefinition[] = [
  {
    key: 'text',
    type: 'string',
    label: 'Text',
    required: true,
    validators: [{ type: 'min_length', options: { value: 2 } }, { type: 'max_length', options: { value: 5 } }],
  },
  {
    key: 'integer',
    type: 'int',
    label: 'Integer',
    required: true,
    validators: [{ type: 'min', options: { value: 1 } }, { type: 'max', options: { value: 4 } }],
    options: { step: 1 },
  },
  {
    key: 'float',
    type: 'float',
    label: 'Float',
    required: true,
    validators: [],
    options: { step: 0.1 },
  },
  {
    key: 'checked',
    type: 'checkbox',
    label: 'Checked',
    required: true,
    validators: [],
  },
  {
    key: 'radio',
    type: 'radio',
    label: 'Radio',
    required: true,
    validators: [],
    options: { choices: [{ value: 'a', label: 'A' }] },
  },
  {
    key: 'single',
    type: 'select',
    label: 'Single',
    required: true,
    validators: [],
    options: { choices: [{ value: 'a', label: 'A' }], multiple: false },
  },
  {
    key: 'multiple',
    type: 'select',
    label: 'Multiple',
    required: false,
    validators: [],
    options: { choices: [{ value: 'a', label: 'A' }], multiple: true },
  },
  {
    key: 'area',
    type: 'textarea',
    label: 'Area',
    required: false,
    validators: [{ type: 'max_length', options: { value: 5 } }],
  },
  { key: 'email', type: 'email', label: 'Email', required: false, validators: [] },
  {
    key: 'phone',
    type: 'phone',
    label: 'Phone',
    required: false,
    validators: [],
    options: { pattern: '^\\+[1-9][0-9]{1,14}$' },
  },
  {
    key: 'asset',
    type: 'file',
    label: 'Asset',
    required: true,
    validators: [],
    options: { storages: ['public'], mime_types: ['image/*'] },
  },
]

describe('dynamic field model', () => {
  it.each(['string', 'select'])('applies membership to each %s list item and cardinality to the list', (type) => {
    const field: FieldDefinition = {
      key: 'tags', type, label: 'Tags', required: false,
      options: { multiple: true, choices: ['a', 'b', 'c'].map(value => ({ value, label: value })) },
      validators: [{ type: 'in', options: { values: ['a', 'b'] } }, { type: 'max_items', options: { value: 2 } }],
    }
    expect(validateFieldValues([field], { tags: [] })).toEqual({})
    expect(validateFieldValues([field], { tags: ['a', 'b'] })).toEqual({})
    expect(validateFieldValues([field], { tags: ['a', 'c'] })).toEqual({ 'tags[1]': fieldErrorMessage('in') })
    expect(validateFieldValues([field], { tags: ['a', 'b', 'c'] })).toMatchObject({ tags: fieldErrorMessage('max_items', { value: 2 }) })
    field.validators = [{ type: 'not_in', options: { values: ['b'] } }]
    expect(validateFieldValues([field], { tags: ['a'] })).toEqual({})
    expect(validateFieldValues([field], { tags: ['a', 'b'] })).toEqual({ 'tags[1]': fieldErrorMessage('not_in') })
  })

  it('initializes checkbox and multiple select without pre-filling other required values', () => {
    expect(createFieldValues(fields)).toEqual({
      text: '',
      integer: null,
      float: null,
      checked: false,
      radio: '',
      single: '',
      multiple: [],
      area: '',
      email: '',
      phone: '',
      asset: null,
    })
  })

  it('validates required, numeric, text, email and E.164 constraints', () => {
    expect(
      validateFieldValues(fields, createFieldValues(fields)),
    ).toMatchObject({
      text: 'Поле обязательно.',
      integer: 'Поле обязательно.',
      float: 'Поле обязательно.',
      radio: 'Поле обязательно.',
      single: 'Поле обязательно.',
      asset: 'Поле обязательно.',
    })
    const errors = validateFieldValues(fields, {
      text: 'x',
      integer: 7,
      float: 1.5,
      checked: false,
      radio: 'a',
      single: 'a',
      multiple: ['a'],
      area: 'too long',
      email: 'bad',
      phone: '8999',
      asset: -1,
    })
    expect(errors.text).toContain('Минимум символов')
    expect(errors.integer).toContain('Максимальное')
    expect(errors.area).toContain('Максимум символов')
    expect(errors.email).toContain('электронной')
    expect(errors.phone).toContain('E.164')
    expect(errors.asset).toContain('Выберите файл')
  })

  it('blocks unknown types and maps backend validator codes', () => {
    expect(unsupportedFieldTypes([{ ...fields[0]!, type: 'future' }])).toEqual([
      'text (future)',
    ])
    expect(fieldErrorMessage('oneof')).toContain('недопустимое')
    expect(fieldErrorMessage('required')).toBe('Поле обязательно.')
  })
})

it('validates actual editor availability, including empty nested lists', () => {
  const custom: FieldDefinition = {key:'custom',type:'example.custom',editor:'example.editor',label:'Custom',required:false,validators: []}
  const resolver = {fieldEditor: (code:string) => code === 'example.editor' ? {} : undefined}
  expect(unsupportedFieldTypes([custom])).toEqual(['custom (example.editor)'])
  expect(validateFieldValues([custom],{custom:'kept'})).toEqual({custom:'Редактор «example.editor» недоступен.'})
  expect(validateFieldValues([custom],{custom:'kept'},resolver)).toEqual({})
  const nested: FieldDefinition = {key:'rows',type:'repeater',label:'Rows',required:false,validators: [],options:{fields:[custom]}}
  expect(unsupportedFieldTypes([nested])).toEqual(['rows[].custom (example.editor)'])
  expect(validateFieldValues([nested],{rows:[]})).toHaveProperty('rows[]')
  expect(validateFieldValues([nested],{rows:[{custom:'kept'}]},resolver)).toEqual({})
  expect(validateFieldValues([{...custom,type:'string',options:{multiple:true}}],{custom:['kept']})).toHaveProperty('custom')
  expect(validateFieldValues([{...custom,editor:'html'}],{custom:'value'})).toEqual({})
})
