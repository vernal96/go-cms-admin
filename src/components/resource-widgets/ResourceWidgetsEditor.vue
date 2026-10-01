<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useServerValidation } from '../fields/server-validation'
import { ElButton, ElRow, ElCol, ElEmpty, ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { AdminAPIError, adminRequest, adminRequestVoid } from '../../api/admin-api'
import type {
  ResourceTemplate,
  ResourceWidget,
  WidgetArea,
  WidgetAreaDescriptor,
  WidgetDefinition,
} from '../../types/admin'
import { moveWidget, normalizeWidgetPositions, widgetOrder, effectiveArea, visibleAreas, sortWidgets, type WidgetSettingsValue } from './model'
import WidgetCard from './WidgetCard.vue'
import WidgetPickerDialog from './WidgetPickerDialog.vue'
import WidgetSettingsDialog from './WidgetSettingsDialog.vue'

const props = withDefaults(defineProps<{
  accessToken: string
  siteId: number
  resourceId: number
  template: ResourceTemplate
  definitions: WidgetDefinition[]
  modelValue: ResourceWidget[]
	canUpdate: boolean
	resourceVersion?: number
}>(), { resourceVersion: 1 })
const emit = defineEmits<{
	'update:modelValue': [value: ResourceWidget[]]
	changed: []
  unauthorized: []
}>()

const pickerOpen = ref(false)
const settingsOpen = ref(false)
const saving = ref(false)
const { errors: serverFieldErrors, clear: clearValidation, capture: captureValidation } = useServerValidation()
const pendingArea = ref<WidgetArea>('default')
const selectedDefinition = ref<WidgetDefinition | null>(null)
const editingWidget = ref<ResourceWidget | null>(null)
const draggingID = ref<number | null>(null)
const activeTarget = ref<{ area: WidgetArea; index: number } | null>(null)
const reordering = ref(false)
const pendingAreas = ref<WidgetAreaDescriptor[] | null>(null)

watch(() => [props.siteId, props.resourceId, settingsOpen.value, selectedDefinition.value, editingWidget.value], clearValidation)

const widgetDragType = 'application/x-go-cms-widget'

const areas = computed(() => pendingAreas.value ?? visibleAreas(props.template.widget_areas, props.modelValue))

function widgetsIn(area: WidgetArea): ResourceWidget[] {
  return sortWidgets(props.modelValue)
    .filter((widget) => effectiveArea(widget.area, props.template.widget_areas) === area)
}

function definition(code: string): WidgetDefinition {
  return props.definitions.find((item) => item.code === code) ?? {
    code, module_code: '', module_label: 'Недоступный модуль', module_description: '',
    label: code, description: 'Определение виджета недоступно текущему профилю.', fields: [],
    editor_tabs: [], summary_fields: [], views: [], param_types: {},
  }
}

function add(area: WidgetArea): void {
  pendingArea.value = area
  pickerOpen.value = true
}

function selectWidget(value: WidgetDefinition): void {
  selectedDefinition.value = value
  editingWidget.value = null
  pickerOpen.value = false
  settingsOpen.value = true
}

function edit(value: ResourceWidget): void {
  selectedDefinition.value = definition(value.code)
  editingWidget.value = value
  settingsOpen.value = true
}

async function save(value: WidgetSettingsValue): Promise<void> {
  if (!selectedDefinition.value) return
  clearValidation()
  saving.value = true
  try {
    const path = `/api/sites/${props.siteId}/resources/${props.resourceId}/widgets`
    const saved = editingWidget.value
      ? await adminRequest<ResourceWidget>(`${path}/${editingWidget.value.id}`, props.accessToken, {
			method: 'PATCH', body: JSON.stringify({ ...value, expected_version: props.resourceVersion }),
        })
      : await adminRequest<ResourceWidget>(path, props.accessToken, {
          method: 'POST', body: JSON.stringify({
            code: selectedDefinition.value.code,
            area: pendingArea.value,
			...value, expected_version: props.resourceVersion,
          }),
        })
    const current = editingWidget.value
      ? props.modelValue.map((widget) => widget.id === saved.id ? saved : widget)
      : [...props.modelValue, saved]
	emit('update:modelValue', normalizeWidgetPositions(current))
	emit('changed')
    settingsOpen.value = false
    ElMessage.success(editingWidget.value ? 'Виджет обновлён' : 'Виджет добавлен')
  } catch (error) {
    if (!captureValidation(error)) handleError(error, 'Не удалось сохранить виджет.')
  } finally {
    saving.value = false
  }
}

async function remove(value: ResourceWidget): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `Удалить виджет «${definition(value.code).label}»?`,
      'Удалить виджет?',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch { return }
  try {
    await adminRequestVoid(
      `/api/sites/${props.siteId}/resources/${props.resourceId}/widgets/${value.id}`,
      props.accessToken,
		{ method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expected_version: props.resourceVersion }) },
    )
	emit('update:modelValue', normalizeWidgetPositions(props.modelValue.filter((widget) => widget.id !== value.id)))
	emit('changed')
    ElMessage.success('Виджет удалён')
  } catch (error) {
    handleError(error, 'Не удалось удалить виджет.')
  }
}

function startDrag(value: ResourceWidget, event: DragEvent): void {
  if (!props.canUpdate || reordering.value || !event.dataTransfer) return
  draggingID.value = value.id
  activeTarget.value = null
  event.dataTransfer.setData(widgetDragType, String(value.id))
  event.dataTransfer.effectAllowed = 'move'
}

function activateDropTarget(area: WidgetArea, index: number, event: DragEvent): void {
  if (!canDropAt(area, index)) {
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
    if (isActiveTarget(area, index)) activeTarget.value = null
    return
  }
  event.preventDefault()
  activeTarget.value = { area, index }
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function leaveDropTarget(area: WidgetArea, index: number, event: DragEvent): void {
  const current = event.currentTarget as HTMLElement | null
  const related = event.relatedTarget as Node | null
  if (current && related && current.contains(related)) return
  if (isActiveTarget(area, index)) activeTarget.value = null
}

async function drop(area: WidgetArea, index: number, event: DragEvent): Promise<void> {
  const id = draggingID.value ?? Number(event.dataTransfer?.getData(widgetDragType))
  if (!props.canUpdate || reordering.value || !Number.isInteger(id) || id <= 0 || !canDropAt(area, index, id)) {
    finishDrag()
    return
  }
  event.preventDefault()
  const previous = normalizeWidgetPositions(props.modelValue)
  const moved = moveWidget(previous, id, area, index)
  finishDrag()
  pendingAreas.value = areas.value
  reordering.value = true
  emit('update:modelValue', moved)
  try {
    const response = await adminRequest<{ items: ResourceWidget[] }>(
      `/api/sites/${props.siteId}/resources/${props.resourceId}/widgets/order`,
      props.accessToken,
		{ method: 'PUT', body: JSON.stringify({ expected_version: props.resourceVersion, items: widgetOrder(moved) }) },
    )
	emit('update:modelValue', normalizeWidgetPositions(response.items))
	emit('changed')
  } catch (error) {
    emit('update:modelValue', previous)
    handleError(error, 'Не удалось изменить порядок виджетов.')
  } finally {
    reordering.value = false
    pendingAreas.value = null
  }
}

function canDropAt(area: WidgetArea, index: number, id = draggingID.value): boolean {
  if (!props.canUpdate || reordering.value || id === null || !areas.value.some((item) => item.code === area && item.supports_resource_widgets)) return false
  // Recovered bindings retain their stored ordering after explicit default
  // bindings. Dropping into default targets that explicit prefix only.
  if (area === 'default' && index > props.modelValue.filter((item) => item.area === 'default').length) return false
  const previous = normalizeWidgetPositions(props.modelValue)
  const moved = moveWidget(previous, id, area, index)
  const before = widgetOrder(previous)
  const after = widgetOrder(moved)
  return before.some((item, position) => {
    const next = after[position]
    return !next || item.id !== next.id || item.area !== next.area || item.position !== next.position
  })
}

function isActiveTarget(area: WidgetArea, index: number): boolean {
  return activeTarget.value?.area === area && activeTarget.value.index === index
}

function areaCanDrop(area: WidgetArea): boolean {
  const count = widgetsIn(area).length
  for (let index = 0; index <= count; index++) {
    if (canDropAt(area, index)) return true
  }
  return false
}

function finishDrag(): void {
  draggingID.value = null
  activeTarget.value = null
}

function handleError(error: unknown, fallback: string): void {
  if (error instanceof AdminAPIError && error.status === 401) {
    emit('unauthorized')
    return
  }
  ElMessage.error(error instanceof Error ? error.message : fallback)
}
</script>

<template>
  <div class="resource-widgets-editor">
    <el-row :gutter="22">
      <el-col v-for="area in areas" :key="area.code" :xs="24" :sm="24" :md="area.admin_span" class="widget-area-column">
    <section
      class="widget-area"
      :data-area="area.code"
      :class="{
        'is-drag-available': areaCanDrop(area.code),
        'is-drop-area': activeTarget?.area === area.code,
        'is-reordering': reordering,
      }"
    >
      <header>
        <div><h3>{{ area.label }}</h3></div>
        <el-button v-if="area.supports_resource_widgets" :icon="Plus" :disabled="!canUpdate || reordering" @click="add(area.code)">Добавить виджет</el-button>
      </header>
      <div
        v-if="!widgetsIn(area.code).length"
        class="widget-empty-drop-target"
        :class="{ 'is-available': canDropAt(area.code, 0), 'is-active': isActiveTarget(area.code, 0) }"
        @dragenter.stop="activateDropTarget(area.code, 0, $event)"
        @dragover.stop="activateDropTarget(area.code, 0, $event)"
        @dragleave.stop="leaveDropTarget(area.code, 0, $event)"
        @drop.stop="drop(area.code, 0, $event)"
      ><el-empty description="В разделе нет виджетов" :image-size="70" /></div>
      <template v-for="(item, index) in widgetsIn(area.code)" :key="item.id">
        <div
          class="widget-drop-target"
          :class="{ 'is-available': canDropAt(area.code, index), 'is-active': isActiveTarget(area.code, index) }"
          @dragenter.stop="activateDropTarget(area.code, index, $event)"
          @dragover.stop="activateDropTarget(area.code, index, $event)"
          @dragleave.stop="leaveDropTarget(area.code, index, $event)"
          @drop.stop="drop(area.code, index, $event)"
        />
        <widget-card
          :widget="item"
          :definition="definition(item.code)"
          :sources="template.widget_value_sources"
          :disabled="!canUpdate || reordering"
          :dragging="draggingID === item.id"
          @dragstart="startDrag(item, $event)"
          @dragend="finishDrag"
          @edit="edit(item)"
          @delete="remove(item)"
        />
      </template>
      <div
        v-if="widgetsIn(area.code).length"
        class="widget-drop-target"
        :class="{ 'is-available': canDropAt(area.code, widgetsIn(area.code).length), 'is-active': isActiveTarget(area.code, widgetsIn(area.code).length) }"
        @dragenter.stop="activateDropTarget(area.code, widgetsIn(area.code).length, $event)"
        @dragover.stop="activateDropTarget(area.code, widgetsIn(area.code).length, $event)"
        @dragleave.stop="leaveDropTarget(area.code, widgetsIn(area.code).length, $event)"
        @drop.stop="drop(area.code, widgetsIn(area.code).length, $event)"
      />
    </section>
      </el-col>
    </el-row>

    <widget-picker-dialog v-model="pickerOpen" :widgets="definitions" @select="selectWidget" />
    <widget-settings-dialog
      v-model="settingsOpen"
      :definition="selectedDefinition"
      :sources="template.widget_value_sources"
      :widget="editingWidget"
			:site-id="siteId"
			:access-token="accessToken"
      :saving="saving"
      :server-errors="serverFieldErrors"
      @clear-validation="clearValidation"
      @save="save"
    />
  </div>
</template>

<style scoped>
.widget-area-column { margin-bottom: 22px; }
.widget-area { min-height: 240px; padding: 16px; border: 1px solid var(--el-border-color); border-radius: 8px; background: var(--el-fill-color-extra-light); transition: background-color .14s ease, border-color .14s ease, box-shadow .14s ease, opacity .14s ease; }
.widget-area.is-drag-available { border-color: var(--el-color-primary-light-5); background: color-mix(in srgb, var(--el-color-primary) 3%, var(--el-fill-color-extra-light)); box-shadow: inset 0 0 0 1px var(--el-color-primary-light-7); }
.widget-area.is-drop-area { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); box-shadow: inset 0 0 0 1px var(--el-color-primary); }
.widget-area.is-reordering { cursor: progress; opacity: .78; }
.widget-area header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
.widget-area h3 { margin: 0; }
.widget-area p { margin: 4px 0 0; color: var(--el-text-color-secondary); font-size: 13px; }
.widget-drop-target { display: flex; height: 8px; align-items: center; border-radius: 4px; transition: height .14s ease, background-color .14s ease; }
.widget-drop-target::after { width: 100%; height: 3px; border-radius: 3px; background: transparent; content: ''; transition: background-color .14s ease, box-shadow .14s ease; }
.widget-drop-target.is-available { height: 18px; }
.widget-drop-target.is-available::after { background: var(--el-color-primary-light-7); }
.widget-drop-target.is-active::after { background: var(--el-color-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 18%, transparent); }
.widget-empty-drop-target { min-height: 158px; border: 1px solid transparent; border-radius: 7px; transition: background-color .14s ease, border-color .14s ease, box-shadow .14s ease; }
.widget-empty-drop-target.is-available { border-color: var(--el-color-primary-light-5); background: color-mix(in srgb, var(--el-color-primary) 4%, transparent); }
.widget-empty-drop-target.is-active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); box-shadow: inset 0 0 0 1px var(--el-color-primary); }

</style>
