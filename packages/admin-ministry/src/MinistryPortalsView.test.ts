// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ElementPlus from 'element-plus'
import MinistryPortalsView from './MinistryPortalsView.vue'

const { listMinistryPortals } = vi.hoisted(() => ({ listMinistryPortals: vi.fn() }))
vi.mock('./api', () => ({
  createMinistryPortal: vi.fn(), deleteMinistryPortal: vi.fn(), getMinistryPortal: vi.fn(),
  listMinistryPortals, updateMinistryPortal: vi.fn(),
}))

describe('MinistryPortalsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMinistryPortals.mockResolvedValue({ items: [{ id: 7, title: 'Портал образования', url: 'https://edu.example.ru', is_public: true }] })
  })

  it('renders a real Element Plus table row from the global directory API', async () => {
    const wrapper = mount(MinistryPortalsView, {
      props: { accessToken: 'token', permissions: new Set(['ministry.portal.read']) },
      global: {
        plugins: [ElementPlus],
        directives: { loading: { mounted: () => undefined, updated: () => undefined } },
      },
    })
    await flushPromises()
    expect(listMinistryPortals).toHaveBeenCalledWith('token', '')
    expect(wrapper.text()).toContain('Портал образования')
  })

  it('hides the directory for users without global read permission', () => {
    const wrapper = mount(MinistryPortalsView, { props: { accessToken: 'token', permissions: new Set<string>() } })
    expect(wrapper.text()).toContain('Недостаточно прав')
    expect(listMinistryPortals).not.toHaveBeenCalled()
  })
})
