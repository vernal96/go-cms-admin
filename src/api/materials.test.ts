import { beforeEach, describe, expect, it, vi } from 'vitest'

const { adminRequest } = vi.hoisted(() => ({ adminRequest: vi.fn() }))
vi.mock('./admin-api', () => ({ adminRequest }))

import { getMaterialFields, getMaterialOption, listMaterials } from './materials'

describe('material picker API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries tree and library items with schema restrictions', async () => {
    adminRequest.mockResolvedValue({ items: [], page: 1, per_page: 20, has_more: false })
    await listMaterials('token', 4, { search: 'news', templates: ['news', 'document'], storageKinds: ['tree', 'library_item'] })
    expect(adminRequest).toHaveBeenCalledWith('/api/sites/4/materials?page=1&per_page=20&search=news&template=news&template=document&storage_kind=tree&storage_kind=library_item', 'token')
  })

  it('loads available public fields after selecting a material', async () => {
    adminRequest.mockResolvedValue({ items: [] })
    await getMaterialFields('token', 4, 23)
    expect(adminRequest).toHaveBeenCalledWith('/api/sites/4/materials/23/fields', 'token')
  })

  it('loads a selected material by its identity without scanning result pages', async () => {
    const item = { id: 37, storage_kind: 'library_item', title: 'Новость', template_code: 'news' }
    adminRequest.mockResolvedValue(item)
    await getMaterialOption('token', 4, 37)
    expect(adminRequest).toHaveBeenCalledWith('/api/sites/4/materials/37', 'token')
  })
})
