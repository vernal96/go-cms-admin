<script setup lang="ts">
import { computed } from 'vue'
import { ElButton, ElInput, ElOption, ElSelect } from 'element-plus'
import type { FieldDefinition } from '../../types/admin'

type Filter = { field: string; operator: string; value: unknown; value_kind?: string }
const props = defineProps<{ field: FieldDefinition }>()
const model = defineModel<unknown>()
const choices = computed(() => props.field.options?.choices ?? [])
const filters = computed<Filter[]>(() => Array.isArray(model.value) ? model.value.filter(isFilter) : [])
const operators = [
  { value: 'eq', label: 'Равно' }, { value: 'neq', label: 'Не равно' },
  { value: 'in', label: 'Входит в список' }, { value: 'not_in', label: 'Не входит в список' },
  { value: 'gt', label: 'Больше' }, { value: 'gte', label: 'Больше или равно' },
  { value: 'lt', label: 'Меньше' }, { value: 'lte', label: 'Меньше или равно' },
]
const kinds = [
  { value: 'string', label: 'Текст' }, { value: 'integer', label: 'Целое число' },
  { value: 'float', label: 'Дробное число' }, { value: 'boolean', label: 'Да/нет' },
  { value: 'timestamp', label: 'Дата и время' }, { value: 'reference', label: 'Ссылка' },
  { value: 'json', label: 'JSON' },
]
function isFilter(value: unknown): value is Filter {
  return typeof value === 'object' && value !== null && typeof (value as Filter).field === 'string'
}
function isCustom(path: string): boolean { return path.startsWith('resource.field.') }
function defaultKind(path: string): string {
  if (isCustom(path)) return 'string'
  if (['resource.id', 'resource.sort'].includes(path)) return 'integer'
  if (['resource.is_public', 'resource.is_searchable'].includes(path)) return 'boolean'
  if (['resource.published_at', 'resource.created_at', 'resource.updated_at'].includes(path)) return 'timestamp'
  return 'string'
}
function kind(item: Filter): string { return isCustom(item.field) ? item.value_kind || 'string' : defaultKind(item.field) }
function replace(index: number, patch: Partial<Filter>): void {
  model.value = filters.value.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
}
function add(): void {
  const first = choices.value[0]?.value ?? ''
  model.value = [...filters.value, { field: first, operator: 'eq', value: '', ...(isCustom(first) ? { value_kind: 'string' } : {}) }]
}
function remove(index: number): void { model.value = filters.value.filter((_, itemIndex) => itemIndex !== index) }
function showSetValue(operator: string): boolean { return operator === 'in' || operator === 'not_in' }
function valueText(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  return value == null ? '' : String(value)
}
function parseValue(raw: string, item: Filter): unknown {
  const itemKind = kind(item)
  const parse = (value: string): unknown => {
    if (itemKind === 'integer' || itemKind === 'reference') return Number(value)
    if (itemKind === 'float') return Number(value)
    if (itemKind === 'boolean') return value.trim().toLowerCase() === 'true' || value.trim() === '1'
    if (itemKind === 'json') { try { return JSON.parse(value) } catch { return value } }
    return value
  }
  return showSetValue(item.operator) ? raw.split(',').map(value => parse(value.trim())).filter(value => value !== '') : parse(raw)
}
function changeField(index: number, path: string): void {
  const old = filters.value[index]!
  const { value_kind: _kind, ...rest } = old
  replace(index, { ...rest, field: path, ...(isCustom(path) ? { value_kind: 'string' } : {}) })
}
</script>

<template>
  <div class="builder">
    <div v-for="(item, index) in filters" :key="index" class="builder-row">
      <el-select :model-value="item.field" aria-label="Поле фильтра" @update:model-value="changeField(index, $event)">
        <el-option v-for="choice in choices" :key="choice.value" :label="choice.label" :value="choice.value" />
      </el-select>
      <el-select :model-value="item.operator" aria-label="Оператор фильтра" @update:model-value="replace(index, { operator: $event })">
        <el-option v-for="operator in operators" :key="operator.value" :label="operator.label" :value="operator.value" />
      </el-select>
      <el-select v-if="isCustom(item.field)" :model-value="kind(item)" aria-label="Тип значения" @update:model-value="replace(index, { value_kind: $event })">
        <el-option v-for="option in kinds" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <el-input :model-value="valueText(item.value)" :placeholder="showSetValue(item.operator) ? 'Значения через запятую' : 'Значение'" aria-label="Значение фильтра" @update:model-value="replace(index, { value: parseValue($event, item) })" />
      <el-button aria-label="Удалить фильтр" @click="remove(index)">Удалить</el-button>
    </div>
    <el-button type="primary" plain @click="add">Добавить фильтр</el-button>
  </div>
</template>

<style scoped>
.builder { display: grid; gap: 10px; }
.builder-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: 8px; }
@media (max-width: 760px) { .builder-row { grid-template-columns: 1fr; } }
</style>
