import type { ResourceWidget, WidgetArea, WidgetAreaDescriptor, WidgetParamBinding } from '../../types/admin'

export interface WidgetSettingsValue {
  view: string
  columns: number
  margin_top: number
  margin_bottom: number
  enabled: boolean
  params: Record<string, unknown>
  param_bindings: Record<string, WidgetParamBinding>
}

export const defaultArea: WidgetAreaDescriptor = {
  code: 'default', label: 'Страница сайта', admin_span: 24, supports_resource_widgets: true,
}

export function effectiveArea(area: WidgetArea, areas: WidgetAreaDescriptor[]): WidgetArea {
  return areas.some((item) => item.code === area && item.supports_resource_widgets) ? area : 'default'
}

export function visibleAreas(areas: WidgetAreaDescriptor[], widgets: ResourceWidget[]): WidgetAreaDescriptor[] {
  if (!areas.length) return [defaultArea]
  if (areas.some((area) => area.code === 'default')) return areas
  return widgets.some((item) => effectiveArea(item.area, areas) === 'default') ? [...areas, defaultArea] : areas
}

export function sortWidgets(source: ResourceWidget[]): ResourceWidget[] {
  return [...source].sort((left, right) => {
    const areaDifference = left.area === right.area ? 0
      : left.area === 'default' ? -1 : right.area === 'default' ? 1
        : left.area < right.area ? -1 : 1
    return areaDifference || left.position - right.position || left.id - right.id
  })
}

export function normalizeWidgetPositions(source: ResourceWidget[]): ResourceWidget[] {
  const positions = new Map<WidgetArea, number>()
  return sortWidgets(source).map((widget) => {
    const position = positions.get(widget.area) ?? 0
    positions.set(widget.area, position + 1)
    return {
      ...widget,
      params: { ...widget.params },
      param_bindings: { ...widget.param_bindings },
      position,
    }
  })
}

export function moveWidget(
  source: ResourceWidget[],
  id: number,
  area: WidgetArea,
  targetIndex: number,
): ResourceWidget[] {
  const moving = source.find((widget) => widget.id === id)
  if (!moving) return normalizeWidgetPositions(source)
  const remaining = source.filter((widget) => widget.id !== id)
  const target = remaining
    .filter((widget) => widget.area === area)
    .sort((left, right) => left.position - right.position)
  const adjustedIndex = moving.area === area && moving.position < targetIndex
    ? targetIndex - 1
    : targetIndex
  target.splice(Math.max(0, Math.min(adjustedIndex, target.length)), 0, {
    ...moving,
    area,
  })
  const positionedTarget = target.map((widget, position) => ({ ...widget, position }))
  return normalizeWidgetPositions([
    ...positionedTarget,
    ...remaining.filter((widget) => widget.area !== area),
  ])
}

export function widgetOrder(source: ResourceWidget[]): Array<{
  id: number
  area: WidgetArea
  position: number
}> {
  return normalizeWidgetPositions(source).map(({ id, area, position }) => ({
    id,
    area,
    position,
  }))
}
