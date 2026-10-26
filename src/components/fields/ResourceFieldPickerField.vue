<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElAlert, ElOption, ElSelect } from 'element-plus'
import { AdminAPIError } from '../../api/admin-api'
import { listWidgetTargets, type WidgetTargetField } from '../../api/materials'
import type { FieldChoice } from '../../types/admin'

const props = defineProps<{ field: { options?: { choices?: FieldChoice[] } }; siteId?: number; resourceId?: number; accessToken?: string; targetKey?: string }>()
const model = defineModel<string[]>({ default: () => [] })
const targetFields = ref<WidgetTargetField[]>([])
const loading = ref(false)
const error = ref('')
const choices = computed<FieldChoice[]>(() => targetFields.value.length
  ? targetFields.value.map((item) => ({ value: item.value, label: item.label }))
  : props.field.options?.choices ?? [])

async function load(): Promise<void> {
  targetFields.value = []
  error.value = ''
  if (!props.targetKey || !props.siteId || !props.resourceId || !props.accessToken) return
  loading.value = true
  try {
    const response = await listWidgetTargets(props.accessToken, props.siteId, props.resourceId)
    targetFields.value = response.items.find((item) => item.key === props.targetKey)?.fields ?? []
  } catch (caught) {
    error.value = caught instanceof AdminAPIError ? caught.message : 'Не удалось загрузить поля выбранного списка.'
  } finally { loading.value = false }
}

onMounted(() => void load())
watch(() => [props.siteId, props.resourceId, props.targetKey], () => { model.value = []; void load() })
</script>

<template>
  <div class="resource-field-picker">
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    <el-alert v-else-if="targetKey && !resourceId" type="info" :closable="false" title="Сначала выберите целевой список." />
    <el-select v-model="model" class="full-width" multiple clearable :disabled="loading || !choices.length" :loading="loading" placeholder="Выберите поля">
      <el-option v-for="choice in choices" :key="choice.value" :label="choice.label" :value="choice.value" />
      <el-option v-for="value in (Array.isArray(model) ? model.filter((item): item is string => typeof item === 'string') : []).filter((value) => !choices.some((item) => item.value === value))" :key="`stale:${value}`" :value="value" :label="`${value} (недоступно)`" />
    </el-select>
    <small v-if="targetKey && !loading && !error && resourceId && !choices.length">Для списка нет доступных полей фильтра.</small>
  </div>
</template>

<style scoped>.resource-field-picker{display:grid;gap:6px}</style>
