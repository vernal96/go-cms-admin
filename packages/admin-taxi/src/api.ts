import { adminRequest, adminRequestVoid } from '@go-cms/admin/sdk'

export type TaxiKind = 'permit' | 'car' | 'service'

export interface TaxiRecord {
  id: number
  kind: TaxiKind
  number: string
  name: string
  inn?: string
  license_number?: string
  registration?: string
  region: string
  region_name: string
  status: string
  brand?: string
  model?: string
}

export type TaxiRecordPayload = Omit<TaxiRecord, 'id'>

export interface TaxiRecordPage {
  items: TaxiRecord[]
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface TaxiRecordFilters {
  kind?: TaxiKind
  region?: string
  name?: string
  number?: string
  inn?: string
  license_number?: string
  registration?: string
  page: number
  per_page: number
}

function recordsPath(siteId: number): string {
  return `/api/sites/${siteId}/taxi/records`
}

export function listTaxiRecords(
  accessToken: string,
  siteId: number,
  filters: TaxiRecordFilters,
): Promise<TaxiRecordPage> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return adminRequest(`${recordsPath(siteId)}?${query}`, accessToken)
}

export function createTaxiRecord(
  accessToken: string,
  siteId: number,
  payload: TaxiRecordPayload,
): Promise<TaxiRecord> {
  return adminRequest(recordsPath(siteId), accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateTaxiRecord(
  accessToken: string,
  siteId: number,
  recordId: number,
  payload: TaxiRecordPayload,
): Promise<TaxiRecord> {
  return adminRequest(`${recordsPath(siteId)}/${recordId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteTaxiRecord(
  accessToken: string,
  siteId: number,
  recordId: number,
): Promise<void> {
  return adminRequestVoid(`${recordsPath(siteId)}/${recordId}`, accessToken, {
    method: 'DELETE',
  })
}
