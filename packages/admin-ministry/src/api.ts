import { adminRequest, adminRequestVoid } from '@go-cms/admin/sdk'

export interface MinistryPortal {
  id: number
  title: string
  url: string
  is_public: boolean
}

export type MinistryPortalPayload = Omit<MinistryPortal, 'id'>
export interface MinistryPortalsResponse { items: MinistryPortal[] }

const root = '/api/ministry/portals'

export function listMinistryPortals(accessToken: string, q = ''): Promise<MinistryPortalsResponse> {
  const query = new URLSearchParams()
  if (q.trim()) query.set('q', q.trim())
  return adminRequest(`${root}${query.size ? `?${query}` : ''}`, accessToken)
}

export function createMinistryPortal(accessToken: string, payload: MinistryPortalPayload): Promise<MinistryPortal> {
  return adminRequest(root, accessToken, { method: 'POST', body: JSON.stringify(payload) })
}

export function getMinistryPortal(accessToken: string, id: number): Promise<MinistryPortal> {
  return adminRequest(`${root}/${id}`, accessToken)
}

export function updateMinistryPortal(accessToken: string, id: number, payload: MinistryPortalPayload): Promise<MinistryPortal> {
  return adminRequest(`${root}/${id}`, accessToken, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteMinistryPortal(accessToken: string, id: number): Promise<void> {
  return adminRequestVoid(`${root}/${id}`, accessToken, { method: 'DELETE' })
}
