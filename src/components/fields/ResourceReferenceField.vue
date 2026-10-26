<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElAlert, ElButton, ElOption, ElSelect } from 'element-plus'
import { AdminAPIError } from '../../api/admin-api'
import { getMaterialOption, listMaterials, type MaterialOption } from '../../api/materials'

const props = withDefaults(defineProps<{
  siteId?: number
  accessToken?: string
  templates?: string[]
  storageKinds?: Array<'tree' | 'library_item'>
  multiple?: boolean
}>(), { templates: () => [], storageKinds: () => ['tree', 'library_item'], multiple: false })
const model = defineModel<number | null | number[]>({ default: null })
const items = ref<MaterialOption[]>([])
const selectedItems = ref<MaterialOption[]>([])
const loading = ref(false)
const error = ref('')
const searchTerm = ref('')
const page = ref(1)
const hasMore = ref(false)
const selectedIDsValue = computed(() => {
  if (Array.isArray(model.value)) return model.value.filter((value): value is number => typeof value === 'number' && value > 0)
  return typeof model.value === 'number' && model.value > 0 ? [model.value] : []
})

function label(item: MaterialOption): string {
  const kind = item.storage_kind === 'tree' ? 'Страница' : 'Элемент библиотеки'
  const hierarchy = item.path ? ` · ${item.path}` : ''
  return `${item.title}${hierarchy} — ${kind} (${item.template_code})`
}

async function load(search = '', nextPage = 1): Promise<void> {
  if (!props.siteId || !props.accessToken) { items.value = []; return }
  loading.value = true
  error.value = ''
  try {
    const response = await listMaterials(props.accessToken, props.siteId, { search, page: nextPage, perPage: 100, templates: props.templates, storageKinds: props.storageKinds })
    items.value = nextPage === 1 ? response.items : [...items.value, ...response.items]
    page.value = response.page
    hasMore.value = response.has_more
  } catch (caught) {
    error.value = caught instanceof AdminAPIError ? caught.message : 'Не удалось загрузить материалы.'
  } finally { loading.value = false }
}
function search(searchValue: string): void {
  searchTerm.value = searchValue
  page.value = 1
  void load(searchValue, 1)
}
function loadMore(): void {
  if (!loading.value && hasMore.value) void load(searchTerm.value, page.value + 1)
}

function selectedIDs(): number[] {
  return selectedIDsValue.value
}
function update(value: unknown): void {
  const ids = props.multiple
    ? (Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number' && item > 0) : [])
    : (typeof value === 'number' && value > 0 ? [value] : [])
  const selected = new Set(ids)
  const found = items.value.filter((item) => selected.has(item.id))
  if (found.length) selectedItems.value = [...selectedItems.value.filter((item) => !selected.has(item.id)), ...found]
  model.value = props.multiple ? ids : ids[0] ?? null
}

function allowed(item: MaterialOption): boolean {
  if (props.storageKinds.length && !props.storageKinds.includes(item.storage_kind)) return false
  if (props.templates.length && (!item.template_code || !props.templates.includes(item.template_code))) return false
  return true
}

async function hydrateSelected(ids: number[]): Promise<void> {
  if (!props.siteId || !props.accessToken) return
  const known = new Set([...items.value, ...selectedItems.value].map((item) => item.id))
  const unresolved = ids.filter((id) => !known.has(id))
  if (!unresolved.length) return
  try {
    const found = (await Promise.all(unresolved.map((id) => getMaterialOption(props.accessToken!, props.siteId!, id))))
      .filter(allowed)
    selectedItems.value = [...selectedItems.value.filter((item) => !found.some((next) => next.id === item.id)), ...found]
  } catch (caught) {
    error.value = caught instanceof AdminAPIError ? caught.message : 'Не удалось загрузить выбранный материал.'
  }
}

onMounted(() => void load())
watch(() => [props.siteId, props.templates.join(','), props.storageKinds.join(',')], () => void load())
watch(selectedIDsValue, (ids) => void hydrateSelected(ids), { immediate: true })
</script>

<template>
  <div class="resource-reference-field">
    <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    <el-select :model-value="props.multiple ? selectedIDs() : (typeof model === 'number' ? model : undefined)" class="full-width" filterable remote clearable :multiple="multiple" :remote-method="search" :loading="loading" placeholder="Не выбрано" @update:model-value="update">
      <el-option v-for="item in selectedItems.filter((item) => selectedIDs().includes(item.id) && !items.some((option) => option.id === item.id))" :key="`selected:${item.storage_kind}:${item.id}`" :label="label(item)" :value="item.id" />
      <el-option v-for="id in selectedIDs().filter((value) => !items.some((item) => item.id === value) && !selectedItems.some((item) => item.id === value))" :key="`unknown:${id}`" :value="id" :label="`Материал #${id}`" />
      <el-option v-for="item in items" :key="`${item.storage_kind}:${item.id}`" :label="label(item)" :value="item.id" />
    </el-select>
    <el-button v-if="hasMore" text :loading="loading" @click="loadMore">Загрузить ещё</el-button>
  </div>
</template>

<style scoped>.resource-reference-field{display:grid;gap:6px}.full-width{width:100%}</style>
