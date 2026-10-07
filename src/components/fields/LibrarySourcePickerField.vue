<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElAlert, ElOption, ElPagination, ElSelect } from 'element-plus'
import { adminRequest } from '../../api/admin-api'
import type { SiteListResponse, SiteOption } from '../../types/admin'

interface Source { id: number; site_id: number; site_name: string; domain: string; title: string; path: string | null }
interface Sources { items: Source[]; pagination: { total: number } }
const props = defineProps<{ siteId?: number; accessToken?: string }>()
const model = defineModel<number | undefined>()
const sourceSite = ref<number>()
const sites = ref<SiteOption[]>([])
const sources = ref<Source[]>([])
const siteSearch = ref('')
const search = ref('')
const sitePage = ref(1)
const page = ref(1)
const siteTotal = ref(0)
const total = ref(0)
const loading = ref(false)
const error = ref('')
let sequence = 0
let siteSequence = 0

async function loadSites(value = siteSearch.value): Promise<void> {
  if (value !== siteSearch.value) sitePage.value = 1
  siteSearch.value = value
  const current = ++siteSequence
  try {
    const query = new URLSearchParams({ search: value, page: String(sitePage.value), per_page: '30' })
    const response = await adminRequest<SiteListResponse>(`/api/sites?${query}`, props.accessToken ?? '')
    if (current !== siteSequence) return
    const selected = sites.value.find(item => item.id === sourceSite.value)
    sites.value = response.items
    if (selected && !sites.value.some(item => item.id === selected.id)) sites.value.unshift(selected)
    siteTotal.value = response.pagination.total
  } catch (cause) { if (current === siteSequence) error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить сайты.' }
}

async function load(value = search.value): Promise<void> {
  if (!props.siteId || !sourceSite.value) return
  if (value !== search.value) page.value = 1
  search.value = value
  const current = ++sequence
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ source_site_id: String(sourceSite.value), search: value, page: String(page.value), per_page: '30' })
    const response = await adminRequest<Sources>(`/api/sites/${props.siteId}/resources/library-sources?${query}`, props.accessToken ?? '')
    if (current !== sequence) return
    const selected = sources.value.find(item => item.id === model.value)
    sources.value = response.items
    if (selected && !sources.value.some(item => item.id === selected.id)) sources.value.unshift(selected)
    total.value = response.pagination.total
  } catch (cause) {
    if (current === sequence) error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить библиотеки.'
  } finally { if (current === sequence) loading.value = false }
}

function changeSite(): void {
  model.value = undefined
  sources.value = []
  page.value = 1
  search.value = ''
  void load()
}

async function hydrate(): Promise<void> {
  if (!model.value || !props.siteId || sources.value.some(item => item.id === model.value)) return
  const selectedID = model.value
  try {
    const response = await adminRequest<Sources>(`/api/sites/${props.siteId}/resources/library-sources?selected_id=${selectedID}`, props.accessToken ?? '')
    if (model.value !== selectedID) return
    const selected = response.items[0]
    if (!selected) { error.value = 'Библиотека-источник недоступна.'; return }
    sourceSite.value = selected.site_id
    sources.value = [selected]
    if (!sites.value.some(item => item.id === selected.site_id)) sites.value.unshift({ id: selected.site_id, name: selected.site_name, domain: selected.domain })
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить источник.' }
}

onMounted(() => { void loadSites(); void hydrate() })
watch(model, () => void hydrate())
</script>

<template>
  <div class="library-source-picker">
    <el-select v-model="sourceSite" aria-label="Сайт-источник" placeholder="Выберите сайт-источник" filterable remote :remote-method="loadSites" @change="changeSite">
      <el-option v-for="item in sites" :key="item.id" :label="item.name" :value="item.id" />
    </el-select>
    <el-pagination v-if="siteTotal > 30" v-model:current-page="sitePage" :page-size="30" :total="siteTotal" layout="prev, next" @current-change="loadSites()" />
    <el-select v-model="model" aria-label="Библиотека-источник" placeholder="Выберите библиотеку" filterable remote :remote-method="load" :loading="loading" :disabled="!sourceSite" @visible-change="visible => visible && load()">
      <el-option v-for="item in sources" :key="item.id" :label="`${item.title} (${item.path ?? ''})`" :value="item.id" />
    </el-select>
    <el-pagination v-if="total > 30" v-model:current-page="page" :page-size="30" :total="total" layout="prev, next" @current-change="load()" />
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
  </div>
</template>

<style scoped>.library-source-picker { display: grid; gap: 8px; width: 100%; }</style>
