import { beforeEach, describe, expect, it, vi } from 'vitest'

const { adminRequest } = vi.hoisted(() => ({ adminRequest: vi.fn() }))
vi.mock('../../api/admin-api', () => ({ adminRequest }))

import { createSiteWidget, deleteSiteWidget, getSiteWidgetsMetadata, listSiteWidgets, reorderSiteWidgets, updateSiteWidget } from './api'

describe('shared site widget API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads placements and widget metadata from site-scoped endpoints', async () => {
    adminRequest.mockResolvedValueOnce({ items: [], site_version: 4 }).mockResolvedValueOnce({ widgets: [], areas: [] })
    await listSiteWidgets('token', 7)
    await getSiteWidgetsMetadata('token', 7)
    expect(adminRequest).toHaveBeenNthCalledWith(1, '/api/sites/7/widgets', 'token')
    expect(adminRequest).toHaveBeenNthCalledWith(2, '/api/sites/7/widgets/metadata', 'token')
  })

  it('sends the expected site version for every mutation', async () => {
    adminRequest.mockResolvedValue({ items: [], site_version: 5 })
    const payload = { code: 'banner', area: 'shared_bottom', position: 0, view: 'default', columns: 12, margin_top: 0, margin_bottom: 0, enabled: true, params: {} }
    await createSiteWidget('token', 7, { ...payload, expected_version: 4 })
    await updateSiteWidget('token', 7, 2, { ...payload, expected_version: 5 })
    await deleteSiteWidget('token', 7, 2, 6)
    await reorderSiteWidgets('token', 7, 7, [{ id: 2, area: 'shared_bottom', position: 0 }])
    expect(adminRequest).toHaveBeenNthCalledWith(1, '/api/sites/7/widgets', 'token', { method: 'POST', body: JSON.stringify({ ...payload, expected_version: 4 }) })
    expect(adminRequest).toHaveBeenNthCalledWith(2, '/api/sites/7/widgets/2', 'token', { method: 'PATCH', body: JSON.stringify({ ...payload, expected_version: 5 }) })
    expect(adminRequest).toHaveBeenNthCalledWith(3, '/api/sites/7/widgets/2', 'token', { method: 'DELETE', body: JSON.stringify({ expected_version: 6 }) })
    expect(adminRequest).toHaveBeenNthCalledWith(4, '/api/sites/7/widgets/order', 'token', { method: 'PUT', body: JSON.stringify({ expected_version: 7, items: [{ id: 2, area: 'shared_bottom', position: 0 }] }) })
  })
})
