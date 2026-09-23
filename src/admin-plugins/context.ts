import { inject, type InjectionKey } from 'vue'
import type { AdminPluginRegistry } from './registry'

export const adminPluginRegistryKey: InjectionKey<AdminPluginRegistry> = Symbol('adminPluginRegistry')

export function useAdminPluginRegistry(): AdminPluginRegistry {
 const registry = inject(adminPluginRegistryKey)
 if (!registry) throw new Error('AdminPluginRegistry must be provided by the host')
 return registry
}
