<script setup lang="ts">
import { computed } from 'vue'
import { ElButton, ElOption, ElSelect } from 'element-plus'
import type { FieldDefinition } from '../../types/admin'

type Sort = { field: string; direction: string; value_kind?: string }
const props = defineProps<{ field: FieldDefinition }>()
const model = defineModel<unknown>()
const choices = computed(() => (props.field.options?.choices ?? []).filter(choice => choice.value !== 'resource.annotation'))
const sorts = computed<Sort[]>(() => Array.isArray(model.value) ? model.value.filter(isSort) : [])
const kinds = [
  { value: 'string', label: 'Текст' }, { value: 'integer', label: 'Целое число' },
  { value: 'float', label: 'Дробное число' }, { value: 'timestamp', label: 'Дата и время' },
]
function isSort(value: unknown): value is Sort {
  return typeof value === 'object' && value !== null && typeof (value as Sort).field === 'string'
}
function isCustom(path: string): boolean { return path.startsWith('resource.field.') }
function replace(index: number, patch: Partial<Sort>): void {
  model.value = sorts.value.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
}
function add(): void {
  const first = choices.value[0]?.value ?? ''
  model.value = [...sorts.value, { field: first, direction: 'asc', ...(isCustom(first) ? { value_kind: 'string' } : {}) }]
}
function remove(index: number): void { model.value = sorts.value.filter((_, itemIndex) => itemIndex !== index) }
function changeField(index: number, path: string): void {
  const old = sorts.value[index]!
  const { value_kind: _kind, ...rest } = old
  replace(index, { ...rest, field: path, ...(isCustom(path) ? { value_kind: 'string' } : {}) })
}
</script>

<template>
  <div class="builder">
    <div v-for="(item, index) in sorts" :key="index" class="builder-row">
      <el-select :model-value="item.field" aria-label="Поле сортировки" @update:model-value="changeField(index, $event)">
        <el-option v-for="choice in choices" :key="choice.value" :label="choice.label" :value="choice.value" />
      </el-select>
      <el-select :model-value="item.direction" aria-label="Направление сортировки" @update:model-value="replace(index, { direction: $event })">
        <el-option label="По возрастанию" value="asc" /><el-option label="По убыванию" value="desc" />
      </el-select>
      <el-select v-if="isCustom(item.field)" :model-value="item.value_kind || 'string'" aria-label="Тип сортировки" @update:model-value="replace(index, { value_kind: $event })">
        <el-option v-for="option in kinds" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <el-button aria-label="Удалить сортировку" @click="remove(index)">Удалить</el-button>
    </div>
    <el-button type="primary" plain @click="add">Добавить сортировку</el-button>
  </div>
</template>

<style scoped>
.builder { display: grid; gap: 10px; }
.builder-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) auto auto; gap: 8px; }
@media (max-width: 760px) { .builder-row { grid-template-columns: 1fr; } }
</style>
