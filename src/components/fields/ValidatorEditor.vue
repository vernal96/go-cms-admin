<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElAlert, ElButton, ElOption, ElSelect } from 'element-plus'
import ConfigurationEditor from './ConfigurationEditor.vue'
import type { ValidatorDefinition, ValidatorMetadata } from '../../types/admin'

const props = defineProps<{ available: ValidatorMetadata[]; fieldType: string; multiple?: boolean; siteId?: number; accessToken?: string }>()
const model = defineModel<ValidatorDefinition[]>({ required: true })
const editors = ref<{ validate(): void }[]>([])
const selected = ref('')
const labels = computed(() => new Map(props.available.map(item => [item.code, item.label])))
function compatible(item: ValidatorMetadata): boolean {
  if (item.applicability?.length) return item.applicability.some(rule =>
    (!rule.field_types?.length || rule.field_types.includes(props.fieldType)) &&
    (rule.multiple === undefined || rule.multiple === Boolean(props.multiple)))
  if (item.field_types?.length && !item.field_types.includes(props.fieldType)) return false
  if (item.multiple === true && !props.multiple && props.fieldType !== 'repeater') return false
  if (item.multiple === false && props.multiple) return false
  return true
}
const choices = computed(() => props.available.filter(item => compatible(item) && !model.value.some(value => value.type === item.code)))
function metadata(code: string): ValidatorMetadata | undefined { return props.available.find(item => item.code === code) }
function add(): void {
  if (!selected.value) return
  model.value = [...model.value, { type: selected.value, options: {} }]
  selected.value = ''
}
function remove(index: number): void { model.value = model.value.filter((_, current) => current !== index) }
function move(index: number, direction: number): void {
  const target = index + direction
  if (target < 0 || target >= model.value.length) return
  const next = [...model.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  model.value = next
}
function updateOptions(index: number, value: Record<string, unknown>): void {
  model.value = model.value.map((item, current) => current === index ? { ...item, options: value } : item)
}
function validate(): void {
  for (const [index, item] of model.value.entries()) {
    const type = metadata(item.type)
    if (!type || !compatible(type)) throw new Error(`Валидатор «${labels.value.get(item.type) ?? item.type}» несовместим с текущим типом поля.`)
    editors.value[index]?.validate()
  }
}
defineExpose({ validate })
</script>

<template>
  <section class="validator-editor">
    <h3>Проверки значения</h3>
    <article v-for="(item, index) in model" :key="`${item.type}-${index}`" class="validator-card">
      <div class="validator-heading">
        <strong>{{ labels.get(item.type) ?? item.type }}</strong>
        <div>
          <el-button size="small" :disabled="index === 0" @click="move(index, -1)">Выше</el-button>
          <el-button size="small" :disabled="index === model.length - 1" @click="move(index, 1)">Ниже</el-button>
          <el-button size="small" type="danger" plain @click="remove(index)">Удалить</el-button>
        </div>
      </div>
      <el-alert v-if="!metadata(item.type) || !compatible(metadata(item.type)!)" type="error" :closable="false" title="Проверка несовместима с текущим типом поля. Удалите её или верните прежний тип." />
      <configuration-editor v-else-if="metadata(item.type)!.options.length || metadata(item.type)!.options_editor" :ref="(element: any) => { if (element) editors[index] = element }" :model-value="item.options ?? {}" :fields="metadata(item.type)!.options" :editor="metadata(item.type)!.options_editor" :site-id="siteId" :access-token="accessToken" @update:model-value="updateOptions(index, $event)" />
    </article>
    <div class="validator-add">
      <el-select v-model="selected" clearable filterable placeholder="Добавить проверку">
        <el-option v-for="item in choices" :key="item.code" :label="item.label" :value="item.code" />
      </el-select>
      <el-button :disabled="!selected" @click="add">Добавить</el-button>
    </div>
  </section>
</template>

<style scoped>
.validator-editor{grid-column:1/-1;display:grid;gap:12px}.validator-editor h3{margin:0;font-size:1rem}.validator-card{border:1px solid var(--el-border-color);border-radius:8px;padding:12px}.validator-heading,.validator-add{display:flex;align-items:center;gap:12px;justify-content:space-between}.validator-heading{margin-bottom:8px}.validator-add .el-select{flex:1}
</style>
