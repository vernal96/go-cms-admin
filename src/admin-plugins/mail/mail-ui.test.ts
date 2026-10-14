// @vitest-environment jsdom

import { config, enableAutoUnmount, flushPromises, mount, shallowMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSelectedSite } from '../../composables/use-selected-site'
import MailAttachmentsEditor from './MailAttachmentsEditor.vue'
import MailAddressFields from './MailAddressFields.vue'
import MailAddressListEditor from './MailAddressListEditor.vue'
import MailHtmlPreview from './MailHtmlPreview.vue'
import MailHistoryView from './MailHistoryView.vue'
import MailMessageDetailView from './MailMessageDetailView.vue'
import MailSendView from './MailSendView.vue'
import MailTemplateFormView from './MailTemplateFormView.vue'
import MailVariablesEditor from './MailVariablesEditor.vue'
import MediaField from '../../components/fields/MediaField.vue'
import { createMailTemplate, setMailTemplateEnabled } from './api'
import type { MailTemplatePayload } from './types'

const permissions = new Set([
  'mail.template.read', 'mail.template.create', 'mail.template.update', 'mail.template.delete',
  'mail.message.read', 'mail.message.create', 'mail.message.delete', 'core.file.read',
])

enableAutoUnmount(afterEach)

function router() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: 'mail.templates', path: '/admin/mail/templates', component: { template: '<div />' } },
      { name: 'mail.templates.create', path: '/admin/mail/templates/new', component: { template: '<div />' } },
      { name: 'mail.history', path: '/admin/mail/history', component: { template: '<div />' } },
      { name: 'mail.history.detail', path: '/admin/mail/history/:messageId', component: { template: '<div />' } },
    ],
  })
}

function response(value: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => value } as Response
}

beforeEach(() => {
  config.global.renderStubDefaultSlot = true
  useSelectedSite().setSelected({ id: 5, name: 'Example', domain: 'example.test' })
})

afterEach(() => {
  config.global.renderStubDefaultSlot = false
  useSelectedSite().reset()
  vi.restoreAllMocks()
})

describe('Mail admin UI', () => {
  it('configures a Media variable in the template form and saves the media wire contract', async () => {
    let submitted: MailTemplatePayload | undefined
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/variables')) return response({ items: [], attachment_media_options: { disk: 'private', virtual_path: 'mail/static', settings_code: 'mail_static' } })
      if (url.endsWith('/validator-types')) return response({ items: [] })
      if (url.endsWith('/templates') && init?.method === 'POST') {
        submitted = JSON.parse(String(init.body)) as MailTemplatePayload
        return response({ id: 1 })
      }
      throw new Error(`unexpected request ${url} ${init?.method ?? 'GET'}`)
    }))
    const instanceRouter = router()
    await instanceRouter.push({ name: 'mail.templates.create' })
    await instanceRouter.isReady()
    const wrapper = mount(MailTemplateFormView, {
      props: { accessToken: 'token', permissions },
      global: { plugins: [instanceRouter], stubs: { RichTextEditor: true } },
    })
    await flushPromises()

    const variables = wrapper.getComponent(MailVariablesEditor)
    variables.getComponent({ name: 'ElButton' }).vm.$emit('click')
    await wrapper.vm.$nextTick()
    variables.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 'media')
    await wrapper.vm.$nextTick()
    expect(variables.text()).toContain('Настройки медиа-поля')

    const updateVariableInput = async (index: number, value: string) => {
      variables.findAllComponents({ name: 'ElInput' })[index]!.vm.$emit('update:modelValue', value)
      await wrapper.vm.$nextTick()
    }
    await updateVariableInput(0, 'attachment')
    await updateVariableInput(1, 'Вложение')
    await updateVariableInput(2, 'private')
    await updateVariableInput(3, 'mail/attachments')
    await updateVariableInput(4, 'mail_attachment')
    await updateVariableInput(5, 'application/pdf')

    const mainInputs = wrapper.findAllComponents({ name: 'ElInput' })
    mainInputs[0]?.vm.$emit('update:modelValue', 'media_notice')
    mainInputs[1]?.vm.$emit('update:modelValue', 'Media notice')
    wrapper.getComponent(MailAddressFields).vm.$emit('update:modelValue', { name: 'Sender', email: 'sender@example.test' })
    wrapper.getComponent(MailAddressListEditor).vm.$emit('update:modelValue', [{ name: 'Recipient', email: 'recipient@example.test' }])
    await flushPromises()
    wrapper.findAllComponents({ name: 'ElButton' }).find(button => button.text() === 'Сохранить')!.vm.$emit('click')
    await flushPromises()

    expect(submitted?.variables).toEqual([expect.objectContaining({
      key: 'attachment', type: 'media', label: 'Вложение',
      options: { disk: 'private', virtual_path: 'mail/attachments', settings_code: 'mail_attachment', mime_types: ['application/pdf'], multiple: false },
    })])
    wrapper.unmount()
  })

  it('isolates arbitrary HTML previews in a sandboxed iframe', () => {
    const wrapper = mount(MailHtmlPreview, { props: { html: '<script>parent.hacked=true</script>', title: undefined } })
    const iframe = wrapper.get('iframe')
    expect(iframe.attributes('sandbox')).toBe('')
    expect(iframe.attributes('srcdoc')).toContain('<script>')
    expect(wrapper.html()).not.toContain('v-html')
  })

  it('switches the template body editor and exposes compatible variable types', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ items: [
      { variable: 'site.id', label: 'ID сайта', type: 'int', source: 'site' },
			{ variable: 'site.field.contract', label: 'Договор', type: 'media', source: 'site' },
    ], attachment_media_options: { disk: 'private', virtual_path: 'mail/uploads', settings_code: 'mail_attachment', mime_types: [] } })))
    const instanceRouter = router()
    await instanceRouter.push({ name: 'mail.templates.create' })
    await instanceRouter.isReady()
    const wrapper = shallowMount(MailTemplateFormView, {
      props: { accessToken: 'token', permissions },
      global: { plugins: [instanceRouter] },
    })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'RichTextEditor' }).exists()).toBe(false)
    expect(wrapper.findComponent(MailAttachmentsEditor).props()).toEqual(expect.objectContaining({ attachmentMediaOptions: { disk: 'private', virtual_path: 'mail/uploads', settings_code: 'mail_attachment', mime_types: [] }, uploadContext: { endpoint: '/api/sites/5/mail/attachments/files' } }))
    const contentType = wrapper.findAllComponents({ name: 'ElSelect' }).at(-1)
    contentType?.vm.$emit('update:modelValue', 'html')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'RichTextEditor' }).exists()).toBe(true)

    const variables = shallowMount(MailVariablesEditor, { props: { modelValue: [] } })
    variables.getComponent({ name: 'ElButton' }).vm.$emit('click')
    expect(variables.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      expect.objectContaining({ type: 'string', required: false }),
    ])
  })

  it('labels address fields, explains placeholders, and validates used rows before saving', async () => {
    const sender = mount(MailAddressFields, { props: { modelValue: { name: '', email: '' }, sender: true, emailRequired: true } })
    expect(sender.text()).toContain('Имя отправителя (необязательно)')
    expect(sender.text()).toContain('Email отправителя')
    expect(sender.text()).toContain('Допустимы {{site.*}} и {{data.*}}')

    vi.stubGlobal('fetch', vi.fn(async () => response({ items: [], attachment_media_options: { disk: 'private', virtual_path: 'mail/uploads', settings_code: 'mail_attachment', mime_types: [] } })))
    const instanceRouter = router()
    await instanceRouter.push({ name: 'mail.templates.create' })
    await instanceRouter.isReady()
    const wrapper = shallowMount(MailTemplateFormView, {
      props: { accessToken: 'token', permissions },
      global: { plugins: [instanceRouter] },
    })
    await flushPromises()
    const inputs = wrapper.findAllComponents({ name: 'ElInput' })
    inputs[0]?.vm.$emit('update:modelValue', 'welcome')
    inputs[1]?.vm.$emit('update:modelValue', 'Welcome')
    await wrapper.vm.$nextTick()
    const save = () => wrapper.findAllComponents({ name: 'ElButton' }).find((button) => button.text() === 'Сохранить')!
    await save().trigger('click')
    expect(wrapper.getComponent(MailAddressFields).props('error')).toBe('Email отправителя обязателен.')

    wrapper.getComponent(MailAddressFields).vm.$emit('update:modelValue', { name: 'Sender', email: 'sender@example.test' })
    wrapper.getComponent(MailAddressListEditor).vm.$emit('update:modelValue', [{ name: 'Recipient', email: '' }])
    await wrapper.vm.$nextTick()
    await save().trigger('click')
    expect(wrapper.getComponent(MailAddressListEditor).props('errors')).toEqual({ 0: 'Email обязателен для заполненной строки.' })
    wrapper.unmount()
    sender.unmount()
  })

  it('sends Mail template payloads without a transport field', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response({ id: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    const payload: MailTemplatePayload = {
      code: 'welcome', name: 'Welcome', enabled: true,
      from: { name: '', email: 'sender@example.test' }, to: [{ name: '', email: 'person@example.test' }], cc: [], bcc: [], reply_to: null,
      subject: 'Hello', content_type: 'text', text_body: 'Body', html_body: '', attachments: [], variables: [],
    }
    await createMailTemplate('token', 5, payload)
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).not.toHaveProperty('transport')
  })

  it('uses the semantic enable endpoint', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/templates/3/enabled')) return response({ id: 3, enabled: false, updated_at: '2026-01-02T00:00:00Z' })
      throw new Error(`unexpected request ${url} ${init?.method ?? 'GET'}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(setMailTemplateEnabled('token', 5, 3, false)).resolves.toEqual({ id: 3, enabled: false, updated_at: '2026-01-02T00:00:00Z' })
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/templates/3/enabled'))
    expect(call?.[1]).toEqual(expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ enabled: false }) }))
  })

  it('renders an access-denied route instead of an unauthorized template form', async () => {
    const instanceRouter = router()
    await instanceRouter.push({ name: 'mail.templates.create' })
    await instanceRouter.isReady()
    const wrapper = shallowMount(MailTemplateFormView, {
      props: { accessToken: 'token', permissions: new Set<string>() },
      global: { plugins: [instanceRouter] },
    })
    expect(wrapper.findComponent({ name: 'AccessDeniedView' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ElForm' }).exists()).toBe(false)
  })

  it('renders static attachments through Media tiles and offers only media variables for variable attachments', () => {
    const wrapper = shallowMount(MailAttachmentsEditor, {
      props: {
        modelValue: [{ source: 'static', media_id: 9, filename_template: '' }, { source: 'variable', variable: '', filename_template: '' }, { source: 'site', variable: '', filename_template: '' }],
        variables: [
			{ key: 'document', type: 'media', label: 'Документ', required: false, validators: [], options: { disk: 'public', virtual_path: 'mail/documents', settings_code: 'document' } },
          { key: 'name', type: 'string', label: 'Имя', required: false, validators: [] },
        ],
        siteVariables: [{ variable: 'site.field.contract', label: 'Договор', type: 'media', source: 'site' }],
        accessToken: 'token', siteId: 5, attachmentMediaOptions: { disk: 'private', virtual_path: 'mail/uploads', settings_code: 'mail_attachment', mime_types: [] }, uploadContext: { endpoint: '/api/sites/5/mail/attachments/files' },
      },
    })
    const staticMedia = wrapper.findComponent(MediaField)
    expect(staticMedia.props()).toEqual(expect.objectContaining({ modelValue: 9, disk: 'private', virtualPath: 'mail/uploads', settingsCode: 'mail_attachment', uploadContext: { endpoint: '/api/sites/5/mail/attachments/files' } }))
    staticMedia.vm.$emit('update:modelValue', 10)
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      { source: 'static', media_id: 10, filename_template: '' },
      { source: 'variable', variable: '', filename_template: '' },
      { source: 'site', variable: '', filename_template: '' },
    ])
    const options = wrapper.findAllComponents({ name: 'ElOption' }).map((item) => item.props('value'))
    expect(options).toContain('data.document')
    expect(options).toContain('site.field.contract')
    expect(options).not.toContain('data.name')
  })

  it('shows server validation for mail preview and clears it before a locally blocked retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/send/templates')) return response({ items: [{
        id: 3, code: 'welcome', name: 'Welcome', enabled: true,
        variables: [{ key: 'email', type: 'email', label: 'Email', required: true, validators: [] }],
      }] })
      return response({ error: { code: 'validation_failed', message: 'mail data is invalid', details: {
        fields: [{ key: 'email', code: 'regex' }],
      } } }, 422)
    }))
    const wrapper = shallowMount(MailSendView, { props: { accessToken: 'token', permissions } })
    await flushPromises()
    wrapper.getComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 3)
    await flushPromises()
    const dynamic = wrapper.getComponent({ name: 'DynamicFieldsForm' })
		expect(dynamic.props('fileUploadContext')).toEqual({
			endpoint: '/api/sites/5/mail/send/templates/3/variables/files',
			target: {},
		})
    dynamic.vm.$emit('update:modelValue', { email: 'draft@example.test' })
    await flushPromises()
    const preview = () => wrapper.findAllComponents({ name: 'ElButton' }).find(item => item.text() === 'Предпросмотр')!
    preview().vm.$emit('click')
    await flushPromises()
    expect(wrapper.getComponent({ name: 'ServerValidationErrors' }).props('errors')).toEqual([{ key: 'email', code: 'regex' }])
    expect(dynamic.props('errors')).toEqual({})
    expect(dynamic.props('modelValue')).toEqual({ email: 'draft@example.test' })
    dynamic.vm.$emit('update:modelValue', { email: '' })
    await flushPromises()
    preview().vm.$emit('click')
    await flushPromises()
    expect(wrapper.getComponent({ name: 'ServerValidationErrors' }).props('errors')).toBeNull()
    expect(dynamic.props('errors')).toHaveProperty('email')
  })

  it('previews backend-rendered content, shows warnings, and queues once', async () => {
    const calls: Array<{ url: string; method: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET' })
      if (url.includes('/send/templates')) return response({ items: [{
        id: 3, site_id: 5, code: 'welcome', name: 'Welcome', enabled: true,
        from: { name: '', email: 'noreply@example.test' }, to: [{ name: '', email: '{{data.email}}' }], cc: [], bcc: [], reply_to: null,
        subject: 'Hello', content_type: 'html', text_body: '', html_body: '<p>{{data.name}}</p>', attachments: [],
        variables: [{ key: 'email', type: 'email', label: 'Email', required: false, validators: [] }], created_at: '', updated_at: '',
      }], pagination: { page: 1, per_page: 100, total: 1 } })
      if (url.endsWith('/preview')) return response({
        from: { name: '', email: 'noreply@example.test' }, to: [{ name: '', email: 'person@example.test' }], cc: [], bcc: [],
        subject: 'Hello', content_type: 'html', text_body: '', html_body: '<p></p>', attachments: [],
        warnings: [{ field: 'html_body', variable: 'data.name', message: 'missing value' }],
      })
      if (url.endsWith('/send')) return response({ id: 91 }, 202)
      throw new Error(`unexpected request ${url}`)
    }))

    const instanceRouter = router()
    await instanceRouter.push({ name: 'mail.history' })
    await instanceRouter.isReady()
    const wrapper = shallowMount(MailSendView, { props: { accessToken: 'token', permissions }, global: { plugins: [instanceRouter] } })
    await flushPromises()
    wrapper.getComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 3)
    await wrapper.vm.$nextTick()
    const dynamicForm = wrapper.getComponent({ name: 'DynamicFieldsForm' })
    dynamicForm.vm.$emit('update:modelValue', { email: 'person@example.test' })
    await wrapper.vm.$nextTick()
    const buttons = () => wrapper.findAllComponents({ name: 'ElButton' })
    buttons().find((item) => item.text() === 'Предпросмотр')?.vm.$emit('click')
    await flushPromises()
    expect(wrapper.findComponent(MailHtmlPreview).props('html')).toBe('<p></p>')
    expect(wrapper.text()).toContain('data.name')
    buttons().find((item) => item.text() === 'Поставить в очередь')?.vm.$emit('click')
    await flushPromises()
    expect(calls.filter((item) => item.url.endsWith('/send') && item.method === 'POST')).toHaveLength(1)
  })

  it('loads server-paginated history and message attempts by site', async () => {
    const message = {
      id: 91, site_id: 5, template_id: null, template_code: 'welcome', template_name: 'Welcome', rfc_message_id: '<91@example.test>',
      from: { name: '', email: 'noreply@example.test' }, to: [{ name: '', email: 'person@example.test' }], cc: [], bcc: [], reply_to: null,
      subject: 'Hello', content_type: 'text', text_body: 'Body', html_body: '', attachments: [], status: 'accepted', origin: 'manual', origin_source: '', origin_event: '', origin_reference: '', recipients: ['person@example.test'],
      requested_at: '2026-08-27T10:00:00Z', requested_by: 7, requested_by_name: 'Editor', accepted_at: '2026-08-27T10:00:01Z',
      created_at: '2026-08-27T10:00:00Z', updated_at: '2026-08-27T10:00:01Z', attempt_count: 1,
      latest_attempt: { id: 1, message_id: 91, attempt_number: 1, driver: 'smtp', started_at: '2026-08-27T10:00:00Z', finished_at: '2026-08-27T10:00:01Z', status: 'accepted', remote_message_id: 'remote', response_code: '250', safe_error: '', created_at: '2026-08-27T10:00:00Z' },
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/messages?')) return response({ items: [message], pagination: { page: 1, per_page: 20, total: 1 } })
      if (url.endsWith('/messages/91')) return response({ message, attempts: [message.latest_attempt] })
      throw new Error(`unexpected request ${url}`)
    }))
    const instanceRouter = router()
    await instanceRouter.push({ name: 'mail.history' })
    await instanceRouter.isReady()
    config.global.renderStubDefaultSlot = false
    const cardStub = { template: '<div><slot /></div>' }
    const history = shallowMount(MailHistoryView, { props: { accessToken: 'token', permissions }, global: { plugins: [instanceRouter], stubs: { ElCard: cardStub } } })
    await flushPromises()
    expect(history.getComponent({ name: 'ElTable' }).props('data')).toEqual([message])
    await instanceRouter.push({ name: 'mail.history.detail', params: { messageId: 91 } })
    const detail = shallowMount(MailMessageDetailView, { props: { accessToken: 'token', permissions }, global: { plugins: [instanceRouter], stubs: { ElCard: cardStub } } })
    await flushPromises()
    const tables = detail.findAllComponents({ name: 'ElTable' })
    expect(tables.at(-1)?.props('data')).toEqual([message.latest_attempt])
    expect(detail.findComponent(MailHtmlPreview).exists()).toBe(false)
  })
})
