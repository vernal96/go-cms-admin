<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElAlert, ElOption, ElSelect } from 'element-plus'
import { AdminAPIError } from '../../api/admin-api'
import { listWidgetTargets, type WidgetTargetOption } from '../../api/materials'

const props = defineProps<{ siteId?: number; resourceId?: number; accessToken?: string }>()
const model = defineModel<string | undefined>()
const targets = ref<WidgetTargetOption[]>([])
const loading = ref(false)
const error = ref('')

async function load(): Promise<void> {
  targets.value = []
  error.value = ''
  if (!props.siteId || !props.resourceId || !props.accessToken) return
  loading.value = true
  try {
    const response = await listWidgetTargets(props.accessToken, props.siteId, props.resourceId)
    targets.value = response.items
  } catch (caught) {
    error.value = caught instanceof AdminAPIError ? caught.message : 'Не удалось загрузить списки страницы.'
  } finally { loading.value = false }
}

onMounted(() => void load())
watch(() => [props.siteId, props.resourceId], () => void load())
</script>

<template>
  <div class="widget-target-picker">
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    <el-alert v-else-if="!resourceId" type="info" :closable="false" title="Список можно выбрать в настройках виджетов конкретной страницы." />
    <el-select v-else v-model="model" class="full-width" filterable clearable :loading="loading" placeholder="Выберите список">
      <el-option v-for="target in targets" :key="target.key" :value="target.key" :label="target.label" />
      <el-option v-if="typeof model === 'string' && model && !targets.some((target) => target.key === model)" :value="model" :label="`${model} (недоступен)`" />
    </el-select>
    <small v-if="resourceId && !loading && !error && !targets.length">На странице нет доступных списков.</small>
  </div>
</template>

<style scoped>.widget-target-picker{display:grid;gap:6px}.full-width{width:100%}</style>
