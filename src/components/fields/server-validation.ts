import { ref } from 'vue'
import { AdminAPIError } from '../../api/admin-api'
import type { FieldValidationError } from '../../types/auth'
import { fieldErrorMessage } from './model'

export interface ValidationField {
  key: string
  label: string
  options?: { fields?: ValidationField[] }
}

export function useServerValidation() {
  // Keep the original API entries for future field highlighting.
  const errors = ref<FieldValidationError[] | null>(null)
  function clear(): void { errors.value = null }
  function capture(error: unknown): boolean {
    if (!(error instanceof AdminAPIError) || error.status !== 422 ||
        (error.code !== 'validation_failed' && !error.fieldErrors.length)) return false
    errors.value = error.fieldErrors
    return true
  }
  return { errors, clear, capture }
}

export function validationFieldLabel(key: string, fields: readonly ValidationField[]): string {
  const parts = key.match(/[^.[\]]+|\[\d+\]/g) ?? []
  let schema = fields
  const labels: string[] = []
  for (const part of parts) {
    if (part.startsWith('[')) {
      labels.push(`Элемент ${Number(part.slice(1, -1)) + 1}`)
      continue
    }
    const field = schema.find(item => item.key === part)
    labels.push(field?.label?.trim() || part)
    schema = field?.options?.fields ?? []
  }
  return labels.join(' → ') || 'Поле'
}

export function serverValidationMessages(errors: readonly FieldValidationError[], fields: readonly ValidationField[]): string[] {
  return errors.map(error => `${validationFieldLabel(error.key, fields)}: ${fieldErrorMessage(error.code, error.params)}`)
}
