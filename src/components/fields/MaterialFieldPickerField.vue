<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElAlert, ElCheckbox, ElCheckboxGroup } from 'element-plus'
import { AdminAPIError } from '../../api/admin-api'
import { getMaterialFields } from '../../api/materials'

const props = defineProps<{ siteId?: number; accessToken?: string; materialId: number | null }>()
const model = defineModel<unknown>()
const selected = ref<string[]>([])
const fields = ref<Array<{ value: string; label: string }>>([])
const loading = ref(false)
const error = ref('')

async function load(materialId: number | null): Promise<void> {
  fields.value = []
  error.value = ''
  if (!props.siteId || !props.accessToken || !materialId) return
  loading.value = true
  try {
    const response = await getMaterialFields(props.accessToken, props.siteId, materialId)
    fields.value = response.items
    const allowed = new Set(fields.value.map((item) => item.value))
    selected.value = (Array.isArray(model.value) ? model.value.filter((value): value is string => typeof value === 'string') : []).filter((value) => allowed.has(value))
    model.value = [...selected.value]
  } catch (caught) {
    error.value = caught instanceof AdminAPIError ? caught.message : 'Не удалось загрузить поля материала.'
  } finally { loading.value = false }
}

watch(() => [props.siteId, props.materialId], () => void load(props.materialId), { immediate: true })
watch(selected, (values) => { model.value = [...values] }, { deep: true })
</script>

<template>
  <div class="material-fields-picker">
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    <el-alert v-else-if="!materialId" type="info" :closable="false" title="Сначала выберите материал, затем отметьте поля для вывода." />
    <el-alert v-else-if="!loading && !fields.length" type="info" :closable="false" title="У материала нет доступных для вывода публичных полей." />
    <el-checkbox-group v-model="selected" :disabled="loading || !fields.length" class="fields-list">
      <el-checkbox v-for="field in fields" :key="field.value" :value="field.value">{{ field.label }}</el-checkbox>
    </el-checkbox-group>
    <small v-if="loading">Загрузка доступных полей…</small>
  </div>
</template>

<style scoped>.material-fields-picker{display:grid;gap:8px}.fields-list{display:flex;flex-direction:column;align-items:flex-start;gap:6px}</style>
