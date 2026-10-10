<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { ElButton, ElEmpty, ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Document, FolderOpened, Picture, Rank, Upload } from '@element-plus/icons-vue'
import { adminAccessTokenKey, adminPermissionsKey } from '../../admin-context'
import { AdminAPIError, adminBlob, adminRequest, adminUpload } from '../../api/admin-api'
import type { FilesystemItem, MediaDetails } from '../../types/admin'
import type { FileUploadContext } from './file-upload-context'
import { targetForFileUpload } from './file-upload-context'
import FilePickerDialog from '../files/FilePickerDialog.vue'
import ImageEditor from '../images/ImageEditor.vue'
import MediaSettingsDialog from '../images/MediaSettingsDialog.vue'
import type { ImageState } from '../images/image-api'

interface MediaTile {
  id: number
  file_id?: number
  file?: FilesystemItem
  item?: FilesystemItem
  image?: ImageState
  preview?: string
  editable?: boolean
  updatedAt?: string
}
interface DeleteFileResult { operation_id: string; status: 'completed' | 'pending'; status_url: string }
interface DeleteFileStatus { operation_id: string; status: 'pending' | 'completed' }

const props = withDefaults(defineProps<{
  disk: string
  virtualPath: string
  settingsCode: string
  mimeTypes?: string[]
  multiple?: boolean
  siteId?: number
  resourceTemplates?: Array<{ code: string; label: string }>
  uploadContext?: FileUploadContext
  referencePath?: string[]
}>(), { mimeTypes: () => [], multiple: false })
const model = defineModel<unknown>()
const accessToken = inject(adminAccessTokenKey)
const permissions = inject(adminPermissionsKey)
const pickerVisible = ref(false)
const uploadInput = ref<HTMLInputElement>()
const tiles = ref<MediaTile[]>([])
const editor = ref(false)
const settings = ref(false)
const editorTile = ref<MediaTile>()
const settingsTile = ref<MediaTile>()
const context = ref<{ tile: MediaTile; x: number; y: number }>()
const pendingDeletes = ref<Record<number, { statusUrl: string; polling: boolean }>>({})
const dragging = ref<number>()
let generation = 0
const selectedFiles = new Map<number, FilesystemItem>()

const mediaIDs = computed<number[]>(() => {
  const values = props.multiple ? (Array.isArray(model.value) ? model.value : []) : [model.value]
  return values.filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
})
const canRead = computed(() => !!accessToken?.value && !!permissions?.value.has('core.file.read') && !!permissions?.value.has('core.media.read'))
const canChoose = computed(() => canRead.value && !!permissions?.value.has('core.media.create'))
const canUpload = computed(() => canChoose.value && !!permissions?.value.has('core.file.create') && !!props.uploadContext)
const canEdit = computed(() => !!permissions?.value.has('core.media.update') && !!permissions?.value.has('core.file.create'))
const canConfigure = computed(() => !!permissions?.value.has('core.media.read') && !!permissions?.value.has('core.media.update'))
const canDelete = computed(() => !!permissions?.value.has('core.file.delete') && !!permissions?.value.has('core.media.delete'))
const token = computed(() => accessToken?.value ?? '')
const accept = computed(() => props.mimeTypes.join(','))
const pickerPermissions = computed(() => permissions?.value ?? new Set<string>())

watch(() => [mediaIDs.value.join(','), accessToken?.value], () => { void loadTiles() }, { immediate: true })
onBeforeUnmount(() => { generation++; clearPreviews() })

async function loadTiles(): Promise<void> {
  const revision = ++generation
  clearPreviews()
  const ids = [...mediaIDs.value]
  const loaded = await Promise.all(ids.map(async (id) => {
    const tile: MediaTile = { id, item: selectedFiles.get(id) }
    if (!accessToken?.value) return tile
    try {
      const media = await adminRequest<MediaDetails>(`/api/media/${id}`, accessToken.value)
      tile.item = media.file
      tile.editable = media.editable_image
      tile.updatedAt = media.updated_at
      if (isRaster(media.file.mime_type)) {
        const blob = await adminBlob(`/api/files/${media.file.id}/thumbnail?width=128&height=128&fit=contain`, accessToken.value)
        tile.preview = URL.createObjectURL(blob)
      }
    } catch {
      // Non-image Media still has a useful tile; the API remains authoritative.
    }
    return tile
  }))
  if (revision !== generation) {
    for (const tile of loaded) if (tile.preview) URL.revokeObjectURL(tile.preview)
    return
  }
  tiles.value = loaded
}

async function choose(item: FilesystemItem): Promise<void> {
  await createMedia([item])
}
async function chooseMany(items: FilesystemItem[]): Promise<void> {
  await createMedia(items)
}
async function createMedia(items: FilesystemItem[]): Promise<void> {
  if (!accessToken?.value) return
  const existing = props.multiple ? [...mediaIDs.value] : []
  const selected = props.multiple ? items : items.slice(0, 1)
  for (const item of selected) {
    if (!matchesMime(item.mime_type)) {
      ElMessage.error(`Файл «${item.name}» не соответствует MIME-ограничениям поля.`)
      continue
    }
    try {
      const media = await adminRequest<{ id: number }>('/api/media', accessToken.value, {
        method: 'POST', body: JSON.stringify({ file_id: item.id }),
      })
      selectedFiles.set(media.id, item)
      existing.push(media.id)
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : 'Не удалось создать медиа-значение.')
      break
    }
  }
  if (props.multiple) model.value = existing
  else if (existing[0]) model.value = existing[0]
}

async function upload(files: FileList | null): Promise<void> {
  if (!files?.length || !accessToken?.value || !props.uploadContext) return
  const selected = props.multiple ? [...files] : [...files].slice(0, 1)
  const valid = selected.filter((file) => {
    if (matchesMime(file.type)) return true
    ElMessage.error(`Файл «${file.name}» не соответствует MIME-ограничениям поля.`)
    return false
  })
  if (!valid.length) return
  try {
    const created: FilesystemItem[] = []
    for (const file of valid) {
      const body = new FormData()
      body.set('target', JSON.stringify(targetForFileUpload(props.uploadContext, props.referencePath ?? [])))
      body.set('file', file, file.name)
      try { created.push(await adminUpload<FilesystemItem>(props.uploadContext.endpoint, accessToken.value, body)) }
      catch (error) { ElMessage.error(error instanceof Error ? error.message : `Не удалось загрузить «${file.name}».`); break }
    }
    if (created.length) await createMedia(created)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Не удалось загрузить файл.')
  } finally {
    if (uploadInput.value) uploadInput.value.value = ''
  }
}

function matchesMime(mime: string | undefined): boolean {
  if (!props.mimeTypes.length) return true
  return props.mimeTypes.some((allowed) => allowed === mime || (allowed.endsWith('/*') && mime?.startsWith(allowed.slice(0, -1))))
}
function isRaster(mime?: string): boolean { return mime === 'image/jpeg' || mime === 'image/png' }
function isSingleImage(tile: MediaTile): boolean { return tile.editable === true }
function openPicker(): void { if (canChoose.value) pickerVisible.value = true }
function removeValue(tile: MediaTile): void {
  if (props.multiple) model.value = mediaIDs.value.filter((id) => id !== tile.id)
  else model.value = null
  closeContext()
}
function reorder(target: number): void {
  if (dragging.value === undefined || dragging.value === target) return
  const values = [...mediaIDs.value]
  const [moved] = values.splice(dragging.value, 1)
  if (moved !== undefined) values.splice(target, 0, moved)
  model.value = values
  dragging.value = undefined
}
function beginContext(event: MouseEvent, tile: MediaTile): void {
  event.preventDefault()
  context.value = { tile, x: event.clientX, y: event.clientY }
}
function closeContext(): void { context.value = undefined }
function clearPreviews(): void {
  for (const tile of tiles.value) if (tile.preview) URL.revokeObjectURL(tile.preview)
  tiles.value = []
}
function updateTile(state: ImageState): void {
  const tile = editorTile.value
  if (!tile) return
  tile.image = state
  tile.item = state.current_file
  tile.editable = state.editable
  void loadTiles()
}

async function deletePermanently(tile: MediaTile): Promise<void> {
  if (!props.siteId || !accessToken?.value || !tile.item || !tile.updatedAt) {
    ElMessage.error('Не удалось загрузить актуальные данные медиа для безопасного удаления.')
    return
  }
  const endpoint = `/api/sites/${props.siteId}/media/${tile.id}/delete-file`
  try {
    await ElMessageBox.confirm(
      `Файл «${tile.item.name}» будет удалён физически, если сервер подтвердит, что у него нет других ссылок. Продолжить?`,
      'Удалить файл совсем', { confirmButtonText: 'Удалить совсем', cancelButtonText: 'Отмена', type: 'warning', confirmButtonClass: 'el-button--danger' },
    )
    const result = await adminRequest<DeleteFileResult>(endpoint, accessToken.value, {
      method: 'POST', body: JSON.stringify({ expected_file_id: tile.item.id, expected_updated_at: tile.updatedAt }),
    })
    if (result.status === 'completed') completeDelete(tile)
    else if (result.operation_id) {
      pendingDeletes.value[tile.id] = { statusUrl: `/api/sites/${props.siteId}/media-file-deletions/${encodeURIComponent(result.operation_id)}`, polling: false }
      ElMessage.info('Удаление выполняется. Плитка останется здесь до подтверждения сервера.')
      void pollDelete(tile)
    } else ElMessage.error('Сервер не вернул идентификатор операции удаления.')
  } catch (error) {
    if (error instanceof Error && error.message !== 'cancel') ElMessage.error(deletionErrorMessage(error))
  }
}

function completeDelete(tile: MediaTile): void {
  delete pendingDeletes.value[tile.id]
  removeValue(tile)
  ElMessage.success('Файл и сохранённую ссылку удалили.')
}

async function pollDelete(tile: MediaTile): Promise<void> {
  const operation = pendingDeletes.value[tile.id]
  if (!operation || operation.polling || !accessToken?.value) return
  operation.polling = true
  try {
    for (let attempt = 0; attempt < 20; attempt++) {
      const status = await adminRequest<DeleteFileStatus>(operation.statusUrl, accessToken.value)
      if (status.status === 'completed') { completeDelete(tile); return }
      await new Promise(resolve => window.setTimeout(resolve, 1000))
    }
    operation.polling = false
    ElMessage.info('Удаление ещё выполняется. Запросите статус ещё раз через контекстное меню плитки.')
  } catch (error) {
    operation.polling = false
    ElMessage.error(deletionErrorMessage(error))
  }
}

function deletionErrorMessage(error: unknown): string {
  if (error instanceof AdminAPIError) {
    if (error.code === 'media_file_in_use') return 'Файл используется в других местах, поэтому удалить его нельзя.'
    if (error.code === 'media_file_delete_conflict') return 'Медиа изменилось после загрузки. Обновите поле и повторите попытку.'
  }
  return error instanceof Error ? error.message : 'Не удалось удалить файл.'
}

async function confirmDelete(tile: MediaTile): Promise<void> {
  try {
    await deletePermanently(tile)
  } catch { /* cancelled */ }
  closeContext()
}
</script>

<template>
  <div class="file-field">
    <div v-if="tiles.length" class="file-field-grid" :class="{ 'is-multiple': multiple }">
      <button v-for="(tile, index) in tiles" :key="tile.id" type="button" class="file-tile file-field-tile"
        :class="{ 'is-drag-source': dragging === index }" :draggable="multiple" :aria-disabled="!canChoose" @click="openPicker"
        @contextmenu="beginContext($event, tile)" @dragstart="dragging = index" @dragover.prevent @drop.prevent="reorder(index)" @dragend="dragging = undefined">
        <span v-if="multiple" class="file-drag-handle" draggable="false" :title="`Перетащить «${tile.item?.name ?? tile.id}»`"><Rank /></span>
        <img v-if="tile.preview" :src="tile.preview" :alt="tile.item?.name ?? ''" class="file-tile-thumbnail" />
        <component v-else :is="tile.item?.mime_type?.startsWith('image/') ? Picture : Document" class="file-tile-icon" />
        <span class="file-tile-name" :title="tile.item?.name ?? `Media #${tile.id}`">{{ tile.item?.name ?? `Media #${tile.id}` }}</span>
        <span class="file-tile-extra">{{ tile.item?.mime_type ?? 'Медиа' }}</span>
      </button>
    </div>
    <el-empty v-else-if="multiple" description="Файлы не выбраны" :image-size="48" />
    <div class="file-field-actions">
      <el-button :icon="FolderOpened" :disabled="!canChoose" @click="openPicker">Выбрать файл</el-button>
      <el-button :icon="Upload" :disabled="!canUpload" @click="uploadInput?.click()">Загрузить</el-button>
      <el-button v-if="!multiple && mediaIDs.length" :icon="Delete" title="Убрать значение" @click="model = null">Убрать</el-button>
    </div>
    <input ref="uploadInput" hidden type="file" :multiple="multiple" :accept="accept" @change="upload(($event.target as HTMLInputElement).files)" />
    <file-picker-dialog v-if="token && permissions" v-model="pickerVisible" :access-token="token"
      :permissions="pickerPermissions" :storages="[disk]" :mime-types="mimeTypes" :multiple="multiple" @select="choose" @select-multiple="chooseMany" />
    <div v-if="context" class="file-context-menu" :style="{ left: `${context.x}px`, top: `${context.y}px` }" @click.stop>
      <button v-if="isSingleImage(context.tile) && canEdit" type="button" @click="editorTile = context.tile; editor = true; closeContext()">Редактирование</button>
      <button type="button" :disabled="!siteId || !settingsCode || !canConfigure" @click="settingsTile = context.tile; settings = true; closeContext()">Мета данные</button>
      <button type="button" @click="removeValue(context.tile)">Удалить</button>
      <button v-if="pendingDeletes[context.tile.id]" type="button" :disabled="pendingDeletes[context.tile.id]?.polling" @click="pollDelete(context.tile)">Проверить удаление</button>
      <button v-else-if="canDelete" type="button" class="danger" @click="confirmDelete(context.tile)">Удалить совсем</button>
    </div>
    <image-editor v-if="editorTile" v-model="editor" :access-token="token" :base-url="`/api/media/${editorTile.id}/image`" @saved="updateTile" />
    <media-settings-dialog v-if="settingsTile && siteId && settingsCode" v-model="settings" :media-id="settingsTile.id" :site-id="siteId" :settings-code="settingsCode" :access-token="token" :resource-templates="resourceTemplates" />
  </div>
</template>

<style scoped>
.file-field { display: grid; width: 100%; gap: 10px; }
.file-field-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.file-field-grid.is-multiple { grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); }
.file-field-tile { width: 100%; cursor: pointer; }
.file-field-actions { display:flex; gap:8px; flex-wrap:wrap; }
.file-field-actions .el-button { margin:0; }
.file-field :deep(.el-empty) { padding: 12px 0; }
</style>
