<script setup lang="ts">
import { computed } from 'vue'
import { ElAlert } from 'element-plus'
import type { FieldValidationError } from '../../types/auth'
import { serverValidationMessages, type ValidationField } from './server-validation'

const props = withDefaults(defineProps<{
  errors?: FieldValidationError[] | null
  fields?: ValidationField[]
}>(), { errors: null, fields: () => [] })
const messages = computed(() => serverValidationMessages(props.errors ?? [], props.fields))
</script>

<template>
  <el-alert v-if="errors !== null" class="server-validation-errors" type="error" :closable="false" show-icon role="alert" title="Проверьте введённые значения">
    <ul v-if="messages.length"><li v-for="(message, index) in messages" :key="index">{{ message }}</li></ul>
    <p v-else>Значения не прошли проверку. Исправьте данные и повторите попытку.</p>
  </el-alert>
</template>

<style scoped>
.server-validation-errors { margin-bottom: 16px; overflow-wrap: anywhere; }
ul { margin: 8px 0 0; padding-left: 20px; }
p { margin: 8px 0 0; }
.server-validation-errors :deep(.el-alert__content) { min-width: 0; }
</style>
