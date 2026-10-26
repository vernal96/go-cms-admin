import { adminRequest } from './admin-api'

export type MaterialStorageKind = 'tree' | 'library_item'
export interface MaterialOption { id: number; storage_kind: MaterialStorageKind; title: string; template_code: string | null; path?: string | null }
export interface MaterialsLookupResponse { items: MaterialOption[]; page: number; per_page: number; has_more: boolean }
export interface MaterialFieldOption { value: string; label: string }
export interface MaterialFieldsResponse { items: MaterialFieldOption[] }
export interface WidgetTargetField { value: string; label: string; kind: string; multiple: boolean }
export interface WidgetTargetOption { key: string; code: string; label: string; fields: WidgetTargetField[] }
export interface WidgetTargetsResponse { items: WidgetTargetOption[] }

export function listMaterials(
  token: string,
  siteId: number,
  filters: { search?: string; page?: number; perPage?: number; templates?: string[]; storageKinds?: MaterialStorageKind[] } = {},
): Promise<MaterialsLookupResponse> {
  const query = new URLSearchParams({ page: String(filters.page ?? 1), per_page: String(filters.perPage ?? 20) })
  if (filters.search) query.set('search', filters.search)
  for (const template of filters.templates ?? []) query.append('template', template)
  for (const kind of filters.storageKinds ?? []) query.append('storage_kind', kind)
  return adminRequest(`/api/sites/${siteId}/materials?${query}`, token)
}

export function getMaterialOption(token: string, siteId: number, materialId: number): Promise<MaterialOption> {
  return adminRequest(`/api/sites/${siteId}/materials/${materialId}`, token)
}

export function getMaterialFields(token: string, siteId: number, materialId: number): Promise<MaterialFieldsResponse> {
  return adminRequest(`/api/sites/${siteId}/materials/${materialId}/fields`, token)
}

export function listWidgetTargets(token: string, siteId: number, resourceId: number): Promise<WidgetTargetsResponse> {
  return adminRequest(`/api/sites/${siteId}/resources/${resourceId}/widget-targets`, token)
}
