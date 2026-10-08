<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ icon?: string }>(), { icon: '' })
const iconClass = computed(() => props.icon === '' ? 'fa-solid fa-file-lines' : props.icon)
</script>

<template><i :class="iconClass" aria-hidden="true" /></template>
