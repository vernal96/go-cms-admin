<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus'
import { Close, Edit, Plus, Search } from '@element-plus/icons-vue'
import { AdminAPIError } from '@go-cms/admin/sdk'
import { useSelectedSite } from '@go-cms/admin/sdk'
import {
  createTaxiRecord,
  deleteTaxiRecord,
  listTaxiRecords,
  updateTaxiRecord,
  type TaxiKind,
  type TaxiRecord,
  type TaxiRecordPayload,
} from './api'

const props = defineProps<{
  accessToken: string
  permissions: ReadonlySet<string>
}>()
const emit = defineEmits<{ unauthorized: [] }>()

const selected = useSelectedSite()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const validationErrors = ref<AdminAPIError['fieldErrors']>([])
const page = ref(1)
const perPage = 20
const total = ref(0)
const items = ref<TaxiRecord[]>([])
const dialogOpen = ref(false)
const editingId = ref<number | null>(null)
const formErrors = reactive({ number: '', name: '' })
const filters = reactive({
  kind: '' as TaxiKind | '',
  region: '',
  name: '',
  number: '',
  inn: '',
  license_number: '',
  registration: '',
})
const form = reactive<TaxiRecordPayload>(emptyRecord())

const canRead = computed(() => props.permissions.has('taxi.record.read'))
const canCreate = computed(() => props.permissions.has('taxi.record.create'))
const canUpdate = computed(() => props.permissions.has('taxi.record.update'))
const canDelete = computed(() => props.permissions.has('taxi.record.delete'))
const canManage = computed(() => canCreate.value || canUpdate.value || canDelete.value)
const dialogTitle = computed(() => editingId.value ? 'Изменить запись' : 'Новая запись')

function emptyRecord(): TaxiRecordPayload {
  return {
    kind: 'permit',
    number: '',
    name: '',
    inn: '',
    license_number: '',
    registration: '',
    region: 'mo',
    region_name: 'Московская область',
    status: '',
    brand: '',
    model: '',
  }
}

function kindLabel(kind: TaxiKind): string {
  return {
    permit: 'Разрешение',
    car: 'Автомобиль',
    service: 'Служба такси',
  }[kind]
}

function handleError(caught: unknown, fallback: string): void {
  validationErrors.value = []
  if (caught instanceof AdminAPIError && caught.status === 401) {
    emit('unauthorized')
    return
  }
  if (caught instanceof AdminAPIError) {
    validationErrors.value = caught.fieldErrors
  }
  error.value = caught instanceof Error ? caught.message : fallback
}

async function load(): Promise<void> {
  const siteId = selected.selectedSite.value?.id
  if (!siteId || !canRead.value) {
    items.value = []
    total.value = 0
    return
  }

  loading.value = true
  error.value = ''
  validationErrors.value = []
  try {
    const response = await listTaxiRecords(props.accessToken, siteId, {
      kind: filters.kind || undefined,
      region: filters.region || undefined,
      name: filters.name.trim() || undefined,
      number: filters.number.trim() || undefined,
      inn: filters.inn.trim() || undefined,
      license_number: filters.license_number.trim() || undefined,
      registration: filters.registration.trim() || undefined,
      page: page.value,
      per_page: perPage,
    })
    items.value = response.items
    total.value = response.total
  } catch (caught) {
    handleError(caught, 'Не удалось загрузить реестр такси.')
  } finally {
    loading.value = false
  }
}

function applyFilters(): void {
  page.value = 1
  void load()
}

function openCreate(): void {
  editingId.value = null
  Object.assign(form, emptyRecord())
  clearFormErrors()
  error.value = ''
  validationErrors.value = []
  dialogOpen.value = true
}

function openEdit(item: TaxiRecord): void {
  editingId.value = item.id
  clearFormErrors()
  Object.assign(form, emptyRecord(), {
    kind: item.kind,
    number: item.number,
    name: item.name,
    inn: item.inn ?? '',
    license_number: item.license_number ?? '',
    registration: item.registration ?? '',
    region: item.region,
    region_name: item.region_name,
    status: item.status,
    brand: item.brand ?? '',
    model: item.model ?? '',
  })
  error.value = ''
  validationErrors.value = []
  dialogOpen.value = true
}

function editRow(row: unknown): void {
  openEdit(row as TaxiRecord)
}

function payload(): TaxiRecordPayload {
  return {
    ...form,
    number: form.number.trim(),
    name: form.name.trim(),
    inn: form.inn?.trim(),
    license_number: form.license_number?.trim(),
    registration: form.registration?.trim().toUpperCase(),
    region: form.region.trim(),
    region_name: form.region_name.trim(),
    status: form.status.trim(),
    brand: form.brand?.trim(),
    model: form.model?.trim(),
  }
}

function clearFormErrors(): void {
  formErrors.number = ''
  formErrors.name = ''
}

function clearFormError(field: keyof typeof formErrors): void {
  if (form[field].trim()) formErrors[field] = ''
}

function validateRequiredFields(): boolean {
  formErrors.number = form.number.trim() ? '' : 'Укажите номер'
  formErrors.name = form.name.trim() ? '' : 'Укажите наименование'
  return !formErrors.number && !formErrors.name
}

async function save(): Promise<void> {
  const siteId = selected.selectedSite.value?.id
  if (!siteId || !validateRequiredFields()) return
  saving.value = true
  error.value = ''
  validationErrors.value = []
  try {
    if (editingId.value) {
      await updateTaxiRecord(
        props.accessToken,
        siteId,
        editingId.value,
        payload(),
      )
      ElMessage.success('Запись обновлена')
    } else {
      await createTaxiRecord(props.accessToken, siteId, payload())
      ElMessage.success('Запись создана')
    }
    dialogOpen.value = false
    await load()
  } catch (caught) {
    handleError(caught, 'Не удалось сохранить запись.')
  } finally {
    saving.value = false
  }
}

async function remove(item: TaxiRecord): Promise<void> {
  const siteId = selected.selectedSite.value?.id
  if (!siteId) return
  try {
    await ElMessageBox.confirm(
      `Удалить запись «${item.number} — ${item.name}»?`,
      'Удаление записи',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  error.value = ''
  try {
    await deleteTaxiRecord(props.accessToken, siteId, item.id)
    ElMessage.success('Запись удалена')
    if (items.value.length === 1 && page.value > 1) page.value -= 1
    await load()
  } catch (caught) {
    handleError(caught, 'Не удалось удалить запись.')
  }
}

function removeRow(row: unknown): void {
  void remove(row as TaxiRecord)
}

watch(() => selected.selectedSite.value?.id, () => {
  page.value = 1
  void load()
})

onMounted(() => void load())
</script>

<template>
  <section class="taxi-records-page">
    <header class="page-header">
      <div>
        <h1>Реестр такси</h1>
        <p>Записи выбранного сайта</p>
      </div>
      <el-button
        v-if="canCreate && selected.selectedSite.value"
        type="primary"
        :icon="Plus"
        @click="openCreate"
      >
        Добавить запись
      </el-button>
    </header>

    <el-alert
      v-if="!canRead"
      type="error"
      :closable="false"
      title="Недостаточно прав для просмотра реестра такси."
    />
    <el-alert
      v-else-if="!selected.selectedSite.value"
      type="warning"
      :closable="false"
      title="Выберите сайт в боковой панели."
    />
    <el-alert
      v-else-if="error && !dialogOpen"
      type="error"
      :closable="false"
      :title="error"
      show-icon
    >
      <ul v-if="validationErrors.length" class="taxi-validation-errors">
        <li v-for="(item, index) in validationErrors" :key="index">
          {{ item.key }}: {{ item.code }}
        </li>
      </ul>
    </el-alert>

    <template v-if="canRead && selected.selectedSite.value">
      <el-form class="taxi-records-filters" @submit.prevent="applyFilters">
        <el-select v-model="filters.kind" clearable placeholder="Тип записи">
          <el-option label="Разрешение" value="permit" />
          <el-option label="Автомобиль" value="car" />
          <el-option label="Служба такси" value="service" />
        </el-select>
        <el-select v-model="filters.region" clearable placeholder="Регион">
          <el-option label="Московская область" value="mo" />
          <el-option label="Москва" value="moscow" />
        </el-select>
        <el-input v-model="filters.name" clearable placeholder="Наименование" />
        <el-input v-model="filters.number" clearable placeholder="Номер" />
        <el-input v-model="filters.inn" clearable placeholder="ИНН" />
        <el-input
          v-model="filters.license_number"
          clearable
          placeholder="Номер лицензии"
        />
        <el-input
          v-model="filters.registration"
          clearable
          placeholder="Госномер"
        />
        <el-button type="primary" :icon="Search" @click="applyFilters">
          Найти
        </el-button>
      </el-form>

      <el-table
        v-loading="loading"
        :data="items"
        stripe
        empty-text="Записей пока нет"
      >
        <el-table-column prop="kind" label="Тип" width="150">
          <template #default="{ row }">
            {{ kindLabel(row.kind) }}
          </template>
        </el-table-column>
        <el-table-column prop="number" label="Номер" min-width="150" />
        <el-table-column prop="name" label="Наименование" min-width="220" />
        <el-table-column prop="region_name" label="Регион" min-width="180" />
        <el-table-column prop="registration" label="Госномер" min-width="140" />
        <el-table-column prop="status" label="Статус" min-width="130" />
        <el-table-column
          v-if="canManage"
          label="Действия"
          width="170"
          align="right"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="canUpdate"
              text
              type="primary"
              :icon="Edit"
              aria-label="Изменить запись"
              @click="editRow(row)"
            />
            <el-button
              v-if="canDelete"
              text
              type="danger"
              aria-label="Удалить запись"
              @click="removeRow(row)"
            >
              Удалить
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > perPage"
        background
        layout="total, prev, pager, next"
        :current-page="page"
        :page-size="perPage"
        :total="total"
        @current-change="page = $event; load()"
      />
    </template>

    <el-dialog
      v-model="dialogOpen"
      :title="dialogTitle"
      width="min(760px, 94vw)"
      destroy-on-close
    >
      <el-alert
        v-if="error"
        type="error"
        :closable="false"
        :title="error"
        show-icon
      >
        <ul v-if="validationErrors.length" class="taxi-validation-errors">
          <li v-for="(item, index) in validationErrors" :key="index">
            {{ item.key }}: {{ item.code }}
          </li>
        </ul>
      </el-alert>
      <el-form class="taxi-record-form" label-position="top">
        <el-form-item label="Тип записи" required>
          <el-select v-model="form.kind" :disabled="saving">
            <el-option label="Разрешение" value="permit" />
            <el-option label="Автомобиль" value="car" />
            <el-option label="Служба такси" value="service" />
          </el-select>
        </el-form-item>
        <el-form-item label="Номер" required :error="formErrors.number">
          <el-input
            v-model="form.number"
            maxlength="64"
            :disabled="saving"
            @input="clearFormError('number')"
          />
        </el-form-item>
        <el-form-item label="Наименование" required :error="formErrors.name">
          <el-input
            v-model="form.name"
            maxlength="200"
            :disabled="saving"
            @input="clearFormError('name')"
          />
        </el-form-item>
        <el-form-item label="Регион" required>
          <el-select v-model="form.region" :disabled="saving">
            <el-option label="Московская область" value="mo" />
            <el-option label="Москва" value="moscow" />
          </el-select>
        </el-form-item>
        <el-form-item label="Название региона">
          <el-input v-model="form.region_name" maxlength="120" :disabled="saving" />
        </el-form-item>
        <el-form-item label="Статус">
          <el-input v-model="form.status" maxlength="120" :disabled="saving" />
        </el-form-item>
        <el-form-item label="ИНН">
          <el-input v-model="form.inn" maxlength="32" :disabled="saving" />
        </el-form-item>
        <el-form-item label="Номер лицензии">
          <el-input
            v-model="form.license_number"
            maxlength="64"
            :disabled="saving"
          />
        </el-form-item>
        <el-form-item label="Госномер">
          <el-input
            v-model="form.registration"
            maxlength="32"
            :disabled="saving"
          />
        </el-form-item>
        <el-form-item label="Марка">
          <el-input v-model="form.brand" maxlength="120" :disabled="saving" />
        </el-form-item>
        <el-form-item label="Модель">
          <el-input v-model="form.model" maxlength="120" :disabled="saving" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :icon="Close" :disabled="saving" @click="dialogOpen = false">
          Отмена
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="save"
        >
          Сохранить
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.taxi-records-page {
  display: grid;
  gap: 16px;
}

.taxi-records-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
}

.taxi-record-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.taxi-record-form :deep(.el-select) {
  width: 100%;
}

.taxi-validation-errors {
  margin: 8px 0 0;
  padding-left: 20px;
}

@media (max-width: 640px) {
  .taxi-record-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
