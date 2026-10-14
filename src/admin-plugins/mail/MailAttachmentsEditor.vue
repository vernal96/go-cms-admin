<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue'
import { ElButton, ElInput, ElOption, ElSelect } from 'element-plus'
import MediaField from '../../components/fields/MediaField.vue'
import type { FileUploadContext } from '../../components/fields/file-upload-context'
import type { FieldDefinition, FieldOptions } from '../../types/admin'
import type { MailAttachmentTemplate, MailSiteVariable } from './types'

const props = withDefaults(defineProps<{
  modelValue: MailAttachmentTemplate[]
  variables: FieldDefinition[]
  siteVariables?: MailSiteVariable[]
  accessToken: string
  siteId: number
  attachmentMediaOptions?: FieldOptions
  uploadContext?: FileUploadContext
}>(), { siteVariables: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: MailAttachmentTemplate[]] }>()

function add(): void {
  emit('update:modelValue', [...props.modelValue, { source: 'static', filename_template: '' }])
}
function remove(index: number): void {
  emit('update:modelValue', props.modelValue.filter((_, current) => current !== index))
}
function update(index: number, patch: Partial<MailAttachmentTemplate>): void {
  const result = [...props.modelValue]
  result[index] = { ...result[index], ...patch }
  emit('update:modelValue', result)
}
function setSource(index: number, source: 'static' | 'variable' | 'site'): void {
  update(index, source === 'static'
    ? { source, variable: undefined }
    : { source, media_id: undefined, variable: undefined })
}
function updateMediaID(index: number, value: unknown): void { update(index, { media_id: typeof value === 'number' ? value : undefined }) }
</script>

<template>
  <div class="mail-attachments-editor">
    <div v-for="(attachment, index) in modelValue" :key="index" class="mail-attachment-row">
      <el-select :model-value="attachment.source" @update:model-value="setSource(index, $event)">
        <el-option value="static" label="Статический файл" />
        <el-option value="variable" label="Файловая переменная" />
        <el-option value="site" label="Файл из настроек сайта" />
      </el-select>
      <media-field
        v-if="attachment.source === 'static'"
        :model-value="attachment.media_id ?? null"
        :disk="String(attachmentMediaOptions?.disk ?? '')"
        :virtual-path="String(attachmentMediaOptions?.virtual_path ?? '')"
        :settings-code="String(attachmentMediaOptions?.settings_code ?? '')"
        :mime-types="attachmentMediaOptions?.mime_types"
        :site-id="siteId"
        :access-token="accessToken"
        :upload-context="uploadContext"
        :disabled="!attachmentMediaOptions"
        @update:model-value="updateMediaID(index, $event)"
      />
      <el-select
        v-else
        :model-value="attachment.variable"
        placeholder="Выберите файловую переменную"
        @update:model-value="update(index, { variable: $event })"
      >
        <template v-if="attachment.source === 'variable'">
          <el-option
            v-for="variable in variables.filter((item) => item.type === 'media')"
            :key="variable.key"
            :label="`${variable.label} — {{data.${variable.key}}}`"
            :value="`data.${variable.key}`"
          />
        </template>
        <template v-else>
          <el-option
            v-for="variable in siteVariables.filter((item) => item.type === 'media')"
            :key="variable.variable"
            :label="`${variable.label} — {{${variable.variable}}}`"
            :value="variable.variable"
          />
        </template>
      </el-select>
      <el-input
        :model-value="attachment.filename_template"
        placeholder="Имя файла (необязательно, поддерживает переменные)"
        @update:model-value="update(index, { filename_template: $event })"
      />
      <el-button :icon="Delete" circle plain aria-label="Удалить вложение" @click="remove(index)" />
    </div>
    <el-button plain :icon="Plus" @click="add">Добавить вложение</el-button>
  </div>
</template>

<style scoped>
.mail-attachments-editor { display: grid; gap: 10px; }
.mail-attachment-row { display: grid; grid-template-columns: 190px minmax(220px, 1fr) minmax(260px, 1.2fr) auto; gap: 8px; align-items: center; }
@media (max-width: 980px) { .mail-attachment-row { grid-template-columns: 1fr; } }
</style>
