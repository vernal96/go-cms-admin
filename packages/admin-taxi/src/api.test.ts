import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminRequest, adminRequestVoid } from '@go-cms/admin/sdk'
import {
  createTaxiRecord,
  deleteTaxiRecord,
  listTaxiRecords,
  updateTaxiRecord,
} from './api'

vi.mock('@go-cms/admin/sdk', () => ({
  adminRequest: vi.fn(),
  adminRequestVoid: vi.fn(),
}))

const requestMock = vi.mocked(adminRequest)
const requestVoidMock = vi.mocked(adminRequestVoid)

describe('Taxi management API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists records with site-scoped filters and pagination', async () => {
    requestMock.mockResolvedValueOnce({
      items: [],
      page: 2,
      per_page: 20,
      total: 31,
      total_pages: 2,
    })

    await listTaxiRecords('token', 7, {
      kind: 'car',
      region: 'mo',
      name: ' Иванов ',
      page: 2,
      per_page: 20,
    })

    expect(requestMock).toHaveBeenCalledWith(
      '/api/sites/7/taxi/records?kind=car&region=mo&name=+%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2+&page=2&per_page=20',
      'token',
    )
  })

  it('uses the site-scoped create, update, and delete routes', async () => {
    const payload = {
      kind: 'permit' as const,
      number: '123',
      name: 'ООО Такси',
      region: 'mo',
      region_name: 'Московская область',
      status: 'active',
    }

    await createTaxiRecord('token', 7, payload)
    await updateTaxiRecord('token', 7, 12, payload)
    await deleteTaxiRecord('token', 7, 12)

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/sites/7/taxi/records',
      'token',
      { method: 'POST', body: JSON.stringify(payload) },
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/sites/7/taxi/records/12',
      'token',
      { method: 'PUT', body: JSON.stringify(payload) },
    )
    expect(requestVoidMock).toHaveBeenCalledWith(
      '/api/sites/7/taxi/records/12',
      'token',
      { method: 'DELETE' },
    )
  })
})
