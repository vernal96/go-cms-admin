<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElAlert, ElButton, ElCard, ElEmpty, ElMessage, ElMessageBox, ElOption, ElSelect, ElSkeleton } from 'element-plus'
import { AdminAPIError } from '../../api/admin-api'
import { useServerValidation } from '../fields/server-validation'
import type { ResourceWidget, WidgetDefinition, WidgetParamBinding } from '../../types/admin'
import WidgetPickerDialog from '../resource-widgets/WidgetPickerDialog.vue'
import WidgetSettingsDialog from '../resource-widgets/WidgetSettingsDialog.vue'
import { createSiteWidget, deleteSiteWidget, getSiteWidgetsMetadata, listSiteWidgets, reorderSiteWidgets, updateSiteWidget } from './api'
import type { SiteWidget, SiteWidgetPayload } from './types'

const props = defineProps<{ accessToken: string; siteId: number; canUpdate: boolean }>()
const emit = defineEmits<{ unauthorized: [] }>()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const items = ref<SiteWidget[]>([])
const definitions = ref<WidgetDefinition[]>([])
const areas = ref<Array<{ code: string; label: string; admin_span: number; editable: boolean }>>([])
const siteVersion = ref(1)
const pickerOpen = ref(false)
const settingsOpen = ref(false)
const selectedDefinition = ref<WidgetDefinition | null>(null)
const editing = ref<SiteWidget | null>(null)
const pendingArea = ref('')
const { errors: serverErrors, message: serverMessage, clear: clearValidation, capture: captureValidation } = useServerValidation()

const areaOptions = computed(() => areas.value.filter((area) => area.editable))
const orderedItems = computed(() => [...items.value].sort((a, b) => {
  const ai = areaOptions.value.findIndex((area) => area.code === a.area)
  const bi = areaOptions.value.findIndex((area) => area.code === b.area)
  return (ai < 0 ? areaOptions.value.length : ai) - (bi < 0 ? areaOptions.value.length : bi) || a.position - b.position || a.id - b.id
}))
const editWidget = computed<ResourceWidget | null>(() => editing.value ? {
  ...editing.value,
  param_bindings: {} as Record<string, WidgetParamBinding>,
} : null)

function definition(code: string): WidgetDefinition {
  return definitions.value.find((item) => item.code === code) ?? {
    code, module_code: '', module_label: 'Недоступный модуль', module_description: '', label: code,
    description: 'Определение виджета недоступно текущему профилю.', fields: [], editor_tabs: [], summary_fields: [], param_types: {}, views: [],
  }
}
function widgetsIn(code: string): SiteWidget[] { return orderedItems.value.filter((item) => item.area === code) }
async function handleError(caught: unknown): Promise<void> {
  if (caught instanceof AdminAPIError && caught.status === 401) { emit('unauthorized'); return }
  if (captureValidation(caught)) return
  error.value = caught instanceof Error ? caught.message : 'Не удалось выполнить запрос.'
  if (caught instanceof AdminAPIError && caught.status === 409) {
    const conflictMessage = 'Сайт был изменён в другой сессии. Список и версия обновлены; проверьте изменения и повторите действие.'
    await load()
    error.value = conflictMessage
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  clearValidation()
  try {
    const [placements, metadata] = await Promise.all([
      listSiteWidgets(props.accessToken, props.siteId),
      getSiteWidgetsMetadata(props.accessToken, props.siteId),
    ])
    items.value = placements.items
    siteVersion.value = placements.site_version
    definitions.value = metadata.widgets
    areas.value = metadata.areas
  } catch (caught) { await handleError(caught) }
  finally { loading.value = false }
}

function add(area: string): void {
  pendingArea.value = area
  pickerOpen.value = true
}
function select(definitionValue: WidgetDefinition): void {
  selectedDefinition.value = definitionValue
  editing.value = null
  pickerOpen.value = false
  settingsOpen.value = true
}
function edit(widget: SiteWidget): void {
  selectedDefinition.value = definition(widget.code)
  editing.value = widget
  settingsOpen.value = true
}

function payload(value: { view: string; columns: number; margin_top: number; margin_bottom: number; enabled: boolean; params: Record<string, unknown> }, code: string, area: string, position: number): SiteWidgetPayload {
  return { code, area, position, view: value.view, columns: value.columns, margin_top: value.margin_top, margin_bottom: value.margin_bottom, enabled: value.enabled, params: value.params }
}

async function save(value: { view: string; columns: number; margin_top: number; margin_bottom: number; enabled: boolean; params: Record<string, unknown> }): Promise<void> {
  if (!selectedDefinition.value || saving.value || !props.canUpdate) return
  saving.value = true
  error.value = ''
  clearValidation()
  try {
    const current = editing.value
    const body = payload(value, current?.code ?? selectedDefinition.value.code, current?.area ?? pendingArea.value, current?.position ?? widgetsIn(pendingArea.value).length)
    const response = current
      ? await updateSiteWidget(props.accessToken, props.siteId, current.id, { ...body, expected_version: siteVersion.value })
      : await createSiteWidget(props.accessToken, props.siteId, { ...body, expected_version: siteVersion.value })
    siteVersion.value = response.site_version
    items.value = current
      ? items.value.map((item) => item.id === response.item.id ? response.item : item)
      : [...items.value, response.item]
    settingsOpen.value = false
    ElMessage.success(current ? 'Виджет обновлён' : 'Виджет добавлен')
  } catch (caught) { await handleError(caught) }
  finally { saving.value = false }
}

async function remove(widget: SiteWidget): Promise<void> {
  if (!props.canUpdate) return
  try { await ElMessageBox.confirm(`Удалить виджет «${definition(widget.code).label}»?`, 'Удалить виджет?', { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' }) }
  catch { return }
  try {
    const response = await deleteSiteWidget(props.accessToken, props.siteId, widget.id, siteVersion.value)
    siteVersion.value = response.site_version
    items.value = items.value.filter((item) => item.id !== widget.id)
    ElMessage.success('Виджет удалён')
  } catch (caught) { await handleError(caught) }
}

function nextOrder(source: SiteWidget[]): Array<{ id: number; area: string; position: number }> {
  const positions = new Map<string, number>()
  return source.map((item) => {
    const position = positions.get(item.area) ?? 0
    positions.set(item.area, position + 1)
    return { id: item.id, area: item.area, position }
  })
}

async function persistOrder(showSuccess = true): Promise<void> {
  const response = await reorderSiteWidgets(props.accessToken, props.siteId, siteVersion.value, nextOrder(orderedItems.value))
  items.value = response.items
  siteVersion.value = response.site_version
  if (showSuccess) ElMessage.success('Порядок виджетов сохранён')
}

async function move(widget: SiteWidget, areaCode: string, offset: number): Promise<void> {
  if (!props.canUpdate) return
  const all = orderedItems.value.map((item) => ({ ...item }))
  const fromIndex = all.findIndex((item) => item.id === widget.id)
  const current = all[fromIndex]
  if (!current) return
  const targetArea = areaCode || current.area
  const targetGroup = all.filter((item) => item.area === targetArea && item.id !== widget.id)
  const nextIndex = current.area === targetArea ? Math.max(0, Math.min(targetGroup.length, current.position + offset)) : targetGroup.length
  all.splice(fromIndex, 1)
  const targetItems = all.filter((item) => item.area === targetArea).sort((a, b) => a.position - b.position)
  const anchor = targetItems[nextIndex]
  const insertion = anchor ? all.findIndex((item) => item.id === anchor.id) : all.reduce((last, item, index) => item.area === targetArea ? index + 1 : last, all.length)
  all.splice(insertion, 0, { ...current, area: targetArea })
  const positions = new Map<string, number>()
  const normalized = all.map((item) => {
    const position = positions.get(item.area) ?? 0
    positions.set(item.area, position + 1)
    return { ...item, position }
  })
  items.value = normalized
  try { await persistOrder() }
  catch (caught) { await handleError(caught) }
}

onMounted(() => void load())
watch(() => props.siteId, () => void load())
</script>

<template>
  <section class="site-widgets-editor" aria-label="Общие виджеты сайта">
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    <el-alert v-if="!canUpdate" type="info" :closable="false" title="У вас нет прав на изменение общих виджетов этого сайта." />
    <el-skeleton v-if="loading" animated :rows="5" />
    <el-empty v-else-if="!areaOptions.length" description="Сайт не объявляет области для общих виджетов." />
    <el-card v-for="area in areaOptions" v-else :key="area.code" shadow="never" class="widget-area-card">
      <template #header><div class="area-heading"><div><strong>{{ area.label }}</strong><small>{{ area.code }}</small></div><el-button v-if="canUpdate" type="primary" plain @click="add(area.code)">Добавить виджет</el-button></div></template>
      <el-empty v-if="!widgetsIn(area.code).length" description="В этой области пока нет виджетов" :image-size="56" />
      <div v-else class="site-widget-list">
        <article v-for="widget in widgetsIn(area.code)" :key="widget.id" class="site-widget-row">
          <div class="widget-description"><strong>{{ definition(widget.code).label }}</strong><span>{{ widget.enabled ? 'Включён' : 'Выключен' }} · {{ widget.columns }}/12</span></div>
          <div class="widget-actions">
            <el-select :model-value="widget.area" aria-label="Область виджета" :disabled="!canUpdate" @update:model-value="move(widget, $event, 0)">
              <el-option v-for="option in areaOptions" :key="option.code" :label="option.label" :value="option.code" />
            </el-select>
            <el-button :disabled="!canUpdate || widget.position === 0" @click="move(widget, widget.area, -1)">Выше</el-button>
            <el-button :disabled="!canUpdate || widget.position >= widgetsIn(widget.area).length - 1" @click="move(widget, widget.area, 1)">Ниже</el-button>
            <el-button :disabled="!canUpdate" @click="edit(widget)">Настроить</el-button>
            <el-button type="danger" plain :disabled="!canUpdate" @click="remove(widget)">Удалить</el-button>
          </div>
        </article>
      </div>
    </el-card>

    <widget-picker-dialog v-model="pickerOpen" :widgets="definitions" @select="select" />
    <widget-settings-dialog
      v-model="settingsOpen"
      :definition="selectedDefinition"
      :widget="editWidget"
      :sources="[]"
      :site-id="siteId"
      :resource-id="0"
      :access-token="accessToken"
      :saving="saving"
      :server-errors="serverErrors"
      :server-message="serverMessage"
      :upload-target="null"
      @save="save"
      @clear-validation="clearValidation"
    />
  </section>
</template>

<style scoped>
.site-widgets-editor{display:grid;gap:16px}.widget-area-card{min-width:0}.area-heading,.site-widget-row{display:flex;align-items:center;justify-content:space-between;gap:16px}.area-heading>div,.widget-description{display:grid;gap:4px}.area-heading small,.widget-description span{color:var(--el-text-color-secondary);font-size:12px}.site-widget-list{display:grid;gap:12px}.site-widget-row{padding:10px 0;border-bottom:1px solid var(--el-border-color-lighter)}.widget-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.widget-actions .el-select{width:170px}@media(max-width:850px){.site-widget-row{align-items:flex-start;flex-direction:column}.widget-actions{width:100%}}
</style>
