import type { Component } from 'vue'

export interface AdminRouteDefinition {
  name: string
  path: string
  component: Component
  props?: boolean
}

export interface AdminPlugin {
  code: string
  routes?: AdminRouteDefinition[]
  fieldEditors?: Record<string, Component>
  configEditors?: Record<string, Component>
  icons?: Record<string, Component>
}

// Replacements are explicit and may only target an installed definition.
export interface AdminOverrides {
  routes?: Record<string, Pick<AdminRouteDefinition, 'component' | 'props'>>
  fieldEditors?: Record<string, Component>
  configEditors?: Record<string, Component>
  icons?: Record<string, Component>
}
