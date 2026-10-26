import { adminRequest } from '../../api/admin-api'
import type { WidgetDefinition } from '../../types/admin'
import type { SiteWidget, SiteWidgetPayload, SiteWidgetsMetadata, SiteWidgetsResponse } from './types'

const root = (siteId: number) => `/api/sites/${siteId}/widgets`

export function listSiteWidgets(token: string, siteId: number): Promise<SiteWidgetsResponse> {
  return adminRequest(root(siteId), token)
}

export function getSiteWidgetsMetadata(token: string, siteId: number): Promise<SiteWidgetsMetadata> {
  return adminRequest(`${root(siteId)}/metadata`, token)
}

export function createSiteWidget(token: string, siteId: number, payload: SiteWidgetPayload & { expected_version: number }): Promise<{ item: SiteWidget; site_version: number }> {
  return adminRequest(root(siteId), token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateSiteWidget(token: string, siteId: number, widgetId: number, payload: SiteWidgetPayload & { expected_version: number }): Promise<{ item: SiteWidget; site_version: number }> {
  return adminRequest(`${root(siteId)}/${widgetId}`, token, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteSiteWidget(token: string, siteId: number, widgetId: number, expectedVersion: number): Promise<{ site_version: number }> {
  return adminRequest(`${root(siteId)}/${widgetId}`, token, { method: 'DELETE', body: JSON.stringify({ expected_version: expectedVersion }) })
}

export function reorderSiteWidgets(token: string, siteId: number, expectedVersion: number, items: Array<Pick<SiteWidget, 'id' | 'area' | 'position'>>): Promise<SiteWidgetsResponse> {
  return adminRequest(`${root(siteId)}/order`, token, { method: 'PUT', body: JSON.stringify({ expected_version: expectedVersion, items }) })
}

export type { WidgetDefinition }
