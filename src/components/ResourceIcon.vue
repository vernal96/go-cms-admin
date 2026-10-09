<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ icon?: string }>(), { icon: '' })
const iconClass = computed(() => {
  const iconName = props.icon.trim()
  return iconName ? `fa-solid fa-${iconName}` : 'fa-solid fa-file-lines'
})
</script>

<template><i :class="iconClass" aria-hidden="true" /></template>
