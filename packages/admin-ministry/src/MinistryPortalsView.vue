<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElAlert, ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElMessage, ElMessageBox, ElSwitch, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { AdminAPIError, ServerValidationErrors, fieldErrorMessage } from '@go-cms/admin/sdk'
import type { ValidationField } from '@go-cms/admin/sdk'
import { createMinistryPortal, deleteMinistryPortal, getMinistryPortal, listMinistryPortals, updateMinistryPortal, type MinistryPortal, type MinistryPortalPayload } from './api'

const props = defineProps<{ accessToken: string; permissions: ReadonlySet<string> }>()
const emit = defineEmits<{ unauthorized: [] }>()
const items = ref<MinistryPortal[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const fieldErrors = ref<AdminAPIError['fieldErrors']>([])
const query = ref('')
const dialogOpen = ref(false)
const editing = ref<MinistryPortal | null>(null)
const form = reactive<MinistryPortalPayload>({ title: '', url: '', is_public: true })
const portalFields: ValidationField[] = [
  { key: 'title', label: 'Название' },
  { key: 'url', label: 'URL' },
  { key: 'is_public', label: 'Публикация' },
]

const canRead = computed(() => props.permissions.has('ministry.portal.read'))
const canCreate = computed(() => props.permissions.has('ministry.portal.create'))
const canUpdate = computed(() => props.permissions.has('ministry.portal.update'))
const canDelete = computed(() => props.permissions.has('ministry.portal.delete'))

function isPortal(value: unknown): value is MinistryPortal {
  return typeof value === 'object' && value !== null &&
    typeof (value as MinistryPortal).id === 'number' &&
    typeof (value as MinistryPortal).title === 'string' &&
    typeof (value as MinistryPortal).url === 'string' &&
    typeof (value as MinistryPortal).is_public === 'boolean'
}

function handleError(caught: unknown): void {
  if (caught instanceof AdminAPIError && caught.status === 401) { emit('unauthorized'); return }
  fieldErrors.value = caught instanceof AdminAPIError ? caught.fieldErrors : []
  error.value = caught instanceof Error ? caught.message : 'Не удалось выполнить запрос.'
}

async function load(): Promise<void> {
  if (!canRead.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await listMinistryPortals(props.accessToken, query.value)
    items.value = response.items
  } catch (caught) { handleError(caught) }
  finally { loading.value = false }
}

function openCreate(): void {
  editing.value = null
  Object.assign(form, { title: '', url: '', is_public: true })
  fieldErrors.value = []
  error.value = ''
  dialogOpen.value = true
}

async function openEdit(value: unknown): Promise<void> {
  if (!canUpdate.value || !isPortal(value)) return
  const item = value
  error.value = ''
  fieldErrors.value = []
  try {
    const current = await getMinistryPortal(props.accessToken, item.id)
    editing.value = current
    Object.assign(form, { title: current.title, url: current.url, is_public: current.is_public })
    dialogOpen.value = true
  } catch (caught) { handleError(caught) }
}

async function save(): Promise<void> {
  if (saving.value || (editing.value ? !canUpdate.value : !canCreate.value)) return
  saving.value = true
  error.value = ''
  fieldErrors.value = []
  try {
    const payload = { title: form.title.trim(), url: form.url.trim(), is_public: form.is_public }
    if (editing.value) await updateMinistryPortal(props.accessToken, editing.value.id, payload)
    else await createMinistryPortal(props.accessToken, payload)
    dialogOpen.value = false
    ElMessage.success(editing.value ? 'Портал обновлён' : 'Портал добавлен')
    await load()
  } catch (caught) { handleError(caught) }
  finally { saving.value = false }
}

async function remove(value: unknown): Promise<void> {
  if (!canDelete.value || !isPortal(value)) return
  const item = value
  try { await ElMessageBox.confirm(`Удалить портал «${item.title}»?`, 'Удаление портала', { confirmButtonText: 'Удалить', cancelButtonText: 'Отмена', type: 'warning' }) }
  catch { return }
  try {
    await deleteMinistryPortal(props.accessToken, item.id)
    ElMessage.success('Портал удалён')
    await load()
  } catch (caught) { handleError(caught) }
}

function errorFor(key: string): string | undefined {
  const item = fieldErrors.value.find((entry) => entry.key === key)
  return item ? fieldErrorMessage(item.code, item.params) : undefined
}

function safeExternalUrl(value: string): string | null {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
  } catch { return null }
}

onMounted(() => void load())
</script>

<template>
  <section v-if="!canRead" class="workspace-page"><el-alert type="error" :closable="false" show-icon title="Недостаточно прав для просмотра порталов." /></section>
  <section v-else class="workspace-page ministry-portals-page">
    <header class="page-header">
      <div><h1>Порталы Подмосковья</h1><p>Общий справочник ссылок, используемый сайтами Mosreg.</p></div>
      <el-button v-if="canCreate" type="primary" @click="openCreate">Добавить портал</el-button>
    </header>
    <server-validation-errors v-if="fieldErrors.length" :errors="fieldErrors" :message="error" :fields="portalFields" />
    <el-alert v-else-if="error" type="error" :closable="false" show-icon :title="error" />
    <div class="toolbar"><el-input v-model="query" clearable placeholder="Поиск по названию или URL" @keyup.enter="load" @clear="load" /><el-button @click="load">Найти</el-button></div>
    <el-table v-loading="loading" :data="items" stripe empty-text="Порталов пока нет">
      <el-table-column prop="title" label="Название" min-width="220" />
      <el-table-column label="Адрес" min-width="260"><template #default="{ row }"><a v-if="safeExternalUrl(row.url)" :href="safeExternalUrl(row.url) ?? undefined" target="_blank" rel="noopener noreferrer">{{ row.url }}</a><span v-else>{{ row.url }}</span></template></el-table-column>
      <el-table-column label="Публикация" width="150"><template #default="{ row }"><el-tag :type="row.is_public ? 'success' : 'info'">{{ row.is_public ? 'Опубликован' : 'Скрыт' }}</el-tag></template></el-table-column>
      <el-table-column label="Действия" width="180" align="right"><template #default="{ row }">
        <el-button v-if="canUpdate" text type="primary" @click="openEdit(row)">Изменить</el-button>
        <el-button v-if="canDelete" text type="danger" @click="remove(row)">Удалить</el-button>
      </template></el-table-column>
    </el-table>

    <el-dialog v-model="dialogOpen" :title="editing ? 'Изменить портал' : 'Новый портал'" width="520px" destroy-on-close>
      <el-form label-position="top" @submit.prevent="save">
        <el-form-item label="Название" :error="errorFor('title')"><el-input v-model="form.title" autofocus maxlength="255" show-word-limit /></el-form-item>
        <el-form-item label="URL" :error="errorFor('url')"><el-input v-model="form.url" type="url" placeholder="https://example.ru" /></el-form-item>
        <el-form-item label="Состояние"><el-switch v-model="form.is_public" active-text="Опубликован" inactive-text="Скрыт" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogOpen = false">Отмена</el-button><el-button type="primary" :loading="saving" @click="save">Сохранить</el-button></template>
    </el-dialog>
  </section>
</template>

<style scoped>
.ministry-portals-page{display:grid;gap:16px}.toolbar{display:flex;gap:8px;max-width:600px}
</style>
