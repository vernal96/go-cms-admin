import type { ResourceWidget, WidgetDefinition } from '../../types/admin'

export type SiteWidget = Omit<ResourceWidget, 'param_bindings'>

export type SiteWidgetPayload = Pick<SiteWidget, 'code' | 'area' | 'position' | 'view' | 'columns' | 'margin_top' | 'margin_bottom' | 'enabled' | 'params'>

export interface SiteWidgetsResponse {
  items: SiteWidget[]
  site_version: number
}

export interface SiteWidgetsMetadata {
  widgets: WidgetDefinition[]
  areas: Array<{ code: string; label: string; admin_span: number; editable: boolean }>
}
