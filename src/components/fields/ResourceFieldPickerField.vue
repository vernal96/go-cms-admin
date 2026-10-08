<script setup lang="ts">
import type { FieldChoice } from '../../types/admin'
import SelectField from './SelectField.vue'

const props = defineProps<{ field: { options?: { choices?: FieldChoice[] } } }>()
const model = defineModel<unknown>()
</script>

<template>
  <select-field v-model="model" :choices="props.field.options?.choices ?? []" multiple />
</template>
