<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

import { AdminAPIError, adminRequest } from '../api/admin-api'
import SiteForm from '../components/SiteForm.vue'
import { useServerValidation } from '../components/fields/server-validation'
import { useSelectedSite } from '../composables/use-selected-site'
import type { SiteDetailsResponse, SiteFormPayload } from '../types/admin'

const props = defineProps<{
  accessToken: string
  permissions: ReadonlySet<string>
}>()
const emit = defineEmits<{ unauthorized: [] }>()
const router = useRouter()
const selected = useSelectedSite()
const submitting = ref(false)
const error = ref<string | null>(null)
const { errors: fieldErrors, clear: clearValidation, capture: captureValidation } = useServerValidation()

async function submit(payload: SiteFormPayload): Promise<void> {
  submitting.value = true
  error.value = null
  clearValidation()
  try {
    const response = await adminRequest<SiteDetailsResponse>(
      '/api/sites',
      props.accessToken,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
    ElMessage.success('Сайт создан')
    selected.refreshSelector()
    await router.push(`/admin/sites/${response.site.id}/edit`)
  } catch (caught) {
    if (caught instanceof AdminAPIError && caught.status === 401)
      emit('unauthorized')
    else {
      if (captureValidation(caught)) return
      error.value =
        caught instanceof Error ? caught.message : 'Не удалось создать сайт.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="workspace-page narrow-page">
    <header class="page-header">
      <div>
        <h1>Новый сайт</h1>
        <p>Параметры определяются выбранным профилем</p>
      </div>
    </header>
    <site-form
      :access-token="accessToken"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      @clear-validation="clearValidation(); error = null"
      @submit="submit"
      @cancel="router.push('/admin/sites')"
      @unauthorized="emit('unauthorized')"
    />
  </section>
</template>
