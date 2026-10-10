<script setup lang="ts">
import { computed, inject } from 'vue'
import { ElAlert } from 'element-plus'
import { adminAccessTokenKey } from '../../admin-context'
import MediaImageField from '../images/MediaImageField.vue'
import { adminPluginRegistryKey } from '../../admin-plugins/context'
import type { FieldDefinition } from '../../types/admin'
import CheckboxField from './CheckboxField.vue'
import NumberField from './NumberField.vue'
import RadioField from './RadioField.vue'
import SelectField from './SelectField.vue'
import TextareaField from './TextareaField.vue'
import TextField from './TextField.vue'
import FileField from './FileField.vue'
import type { FileUploadContext } from './file-upload-context'
import JsonField from './JsonField.vue'
import RepeaterField from './RepeaterField.vue'
import { fieldEditorError, isMultipleField, validatorNumber, type DynamicFieldErrors } from './model'
import MultipleField from './MultipleField.vue'
import ResourcePickerField from './ResourcePickerField.vue'
import LibrarySourcePickerField from './LibrarySourcePickerField.vue'
import RichTextEditor from '../RichTextEditor.vue'
import ResourceTypePickerField from './ResourceTypePickerField.vue'
import ResourceFieldPickerField from './ResourceFieldPickerField.vue'
import FilterBuilderField from './FilterBuilderField.vue'
import SortBuilderField from './SortBuilderField.vue'

const props = defineProps<{
	field: FieldDefinition
 errors?: DynamicFieldErrors
 fieldPath?: string
	referencePath?: string[]
	fileUploadContext?: FileUploadContext
	siteId?: number
	accessToken?: string
	resourceTemplates?: Array<{ code: string; label: string }>
}>()
const injectedToken = inject(adminAccessTokenKey)
const token = computed(() => props.accessToken || injectedToken?.value || '')
const registry = inject(adminPluginRegistryKey, undefined)
const unavailable = computed(() => fieldEditorError(props.field, registry))
const customEditor = computed(() => props.field.editor ? registry?.fieldEditor(props.field.editor) : undefined)
const model = defineModel<unknown>()
const control = computed(() => props.field.editor || props.field.type)
const resourceIDs = computed<number[]>(() => Array.isArray(model.value) ? model.value.filter((item): item is number => typeof item === 'number') : [])
</script>

<template>
	<el-alert v-if="unavailable" type="error" :closable="false" :title="unavailable" />
	<resource-type-picker-field v-else-if="field.editor === 'resource-type-picker'" v-model="model" :field="field" />
	<resource-field-picker-field v-else-if="field.editor === 'resource-field-picker'" v-model="model" :field="field" />
	<filter-builder-field v-else-if="field.editor === 'filter-builder'" v-model="model" :field="field" />
	<sort-builder-field v-else-if="field.editor === 'sort-builder'" v-model="model" :field="field" />
	<file-field v-else-if="control === 'file'" v-model="model" :disk="field.options?.disk ?? ''" :virtual-path="field.options?.virtual_path ?? ''" :settings-code="field.options?.settings_code ?? ''" :mime-types="field.options?.mime_types" :multiple="field.options?.multiple ?? false" :site-id="siteId" :resource-templates="resourceTemplates" :upload-context="fileUploadContext" :reference-path="referencePath ?? [field.key]" />
	<multiple-field v-else-if="isMultipleField(field) && control !== 'select'" v-model="model" :field="field" :errors="errors" :field-path="fieldPath" :site-id="siteId" :access-token="token" :resource-templates="resourceTemplates" />
	<component v-else-if="customEditor" :is="customEditor" v-model="model" :field="field" :site-id="siteId" :access-token="token" :resource-templates="resourceTemplates" />
	<rich-text-editor v-else-if="field.editor === 'html'" :model-value="typeof model === 'string' ? model : ''" @update:model-value="model = $event" />
	<select-field v-else-if="field.editor === 'resource-template'" v-model="model" :choices="(resourceTemplates ?? []).map((item) => ({ value: item.code, label: item.label }))" :multiple="false" />
	<library-source-picker-field v-else-if="field.editor === 'library-source-picker'" :model-value="typeof model === 'number' ? model : undefined" :site-id="siteId" :access-token="token" @update:model-value="model = $event" />
	<resource-picker-field v-else-if="field.editor === 'resource-picker'" :model-value="typeof model === 'number' ? model : undefined" :site-id="siteId ?? 0" :access-token="accessToken ?? ''" @update:model-value="model = $event" />
	<resource-picker-field v-else-if="field.editor === 'resource-multi-picker'" :model-value="resourceIDs" :site-id="siteId ?? 0" :access-token="accessToken ?? ''" multiple @update:model-value="model = $event" />
	<repeater-field v-else-if="control === 'repeater'" v-model="model" :field="field" :site-id="siteId" :access-token="token" :resource-templates="resourceTemplates" :errors="errors" :field-path="fieldPath" :reference-path="referencePath ?? [field.key]" :file-upload-context="fileUploadContext" />
 <media-image-field v-else-if="control === 'media'" :site-id="siteId" :settings-code="field.options?.settings_code" :resource-templates="resourceTemplates" :model-value="typeof model === 'number' ? model : null" :access-token="token" @update:model-value="model = $event" />
	<json-field v-else-if="control === 'json'" v-model="model" />
  <text-field
    v-else-if="
      control === 'string' ||
      control === 'email' ||
      control === 'phone'
    "
    v-model="model"
    :kind="control as 'string' | 'email' | 'phone'"
  />
  <number-field
    v-else-if="control === 'int' || control === 'float'"
    v-model="model"
    :kind="control as 'int' | 'float'"
    :step="field.options?.step"
  />
  <checkbox-field
    v-else-if="control === 'checkbox'"
    v-model="model"
    :label="field.label"
  />
  <radio-field
    v-else-if="control === 'radio'"
    v-model="model"
    :choices="field.options?.choices ?? []"
  />
  <select-field
    v-else-if="control === 'select'"
    v-model="model"
    :choices="field.options?.choices ?? []"
    :multiple="field.options?.multiple ?? false"
    :min-items="Math.max(field.required ? 1 : 0, validatorNumber(field, 'min_items'))"
    :max-items="validatorNumber(field, 'max_items')"
    :errors="errors" :field-path="fieldPath ?? field.key"
  />
  <textarea-field v-else-if="control === 'textarea'" v-model="model" />
  <el-alert
    v-else
    type="error"
    :closable="false"
    :title="`Тип поля «${field.type}» не поддерживается.`"
  />
</template>
