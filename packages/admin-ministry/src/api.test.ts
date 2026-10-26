import { beforeEach, describe, expect, it, vi } from 'vitest'

const { adminRequest, adminRequestVoid } = vi.hoisted(() => ({ adminRequest: vi.fn(), adminRequestVoid: vi.fn() }))
vi.mock('@go-cms/admin/sdk', () => ({ adminRequest, adminRequestVoid }))

import { createMinistryPortal, deleteMinistryPortal, getMinistryPortal, listMinistryPortals, updateMinistryPortal } from './api'

describe('ministry portals API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('lists the global directory with an optional search query', async () => {
    adminRequest.mockResolvedValue({ items: [] })
    await listMinistryPortals('token', ' образование ')
    expect(adminRequest).toHaveBeenCalledWith('/api/ministry/portals?q=%D0%BE%D0%B1%D1%80%D0%B0%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5', 'token')
  })

  it('uses the agreed global CRUD routes and payload', async () => {
    const payload = { title: 'Портал', url: 'https://example.ru', is_public: true }
    adminRequest.mockResolvedValue({ id: 3, ...payload })
    await createMinistryPortal('token', payload)
    await getMinistryPortal('token', 3)
    await updateMinistryPortal('token', 3, payload)
    await deleteMinistryPortal('token', 3)
    expect(adminRequest).toHaveBeenNthCalledWith(1, '/api/ministry/portals', 'token', { method: 'POST', body: JSON.stringify(payload) })
    expect(adminRequest).toHaveBeenNthCalledWith(2, '/api/ministry/portals/3', 'token')
    expect(adminRequest).toHaveBeenNthCalledWith(3, '/api/ministry/portals/3', 'token', { method: 'PUT', body: JSON.stringify(payload) })
    expect(adminRequestVoid).toHaveBeenCalledWith('/api/ministry/portals/3', 'token', { method: 'DELETE' })
  })
})
