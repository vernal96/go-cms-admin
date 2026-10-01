import { describe, expect, it } from 'vitest'
import type { ResourceWidget } from '../../types/admin'
import { moveWidget, widgetOrder, visibleAreas, effectiveArea } from './model'

const widget = (id: number, area: 'body' | 'sidebar', position: number): ResourceWidget => ({
  id, code: 'core_content', area, position, view: 'default', columns: 12,
  margin_top: 0, margin_bottom: 0, enabled: true, params: {}, param_bindings: {},
})

describe('resource widget ordering', () => {
  it('reorders inside one area without changing stable ids', () => {
    const moved = moveWidget([
      widget(41, 'body', 0), widget(42, 'body', 1), widget(43, 'body', 2),
    ], 41, 'body', 3)
    expect(widgetOrder(moved)).toEqual([
      { id: 42, area: 'body', position: 0 },
      { id: 43, area: 'body', position: 1 },
      { id: 41, area: 'body', position: 2 },
    ])
  })

  it('keeps stable ids while reordering and moving across areas', () => {
    const moved = moveWidget([
      widget(41, 'body', 0), widget(42, 'body', 1), widget(77, 'sidebar', 0),
    ], 42, 'sidebar', 0)
    expect(widgetOrder(moved)).toEqual([
      { id: 41, area: 'body', position: 0 },
      { id: 42, area: 'sidebar', position: 0 },
      { id: 77, area: 'sidebar', position: 1 },
    ])
  })
})

it('preserves every unrelated area, including recovered bindings, during a move', () => {
  const source = [widget(1, 'body', 0), { ...widget(2, 'sidebar', 0), area: 'footer' }, { ...widget(3, 'body', 0), area: 'removed' }]
  const moved = moveWidget(source, 1, 'footer', 1)
  expect(widgetOrder(moved)).toEqual([
    { id: 2, area: 'footer', position: 0 },
    { id: 1, area: 'footer', position: 1 },
    { id: 3, area: 'removed', position: 0 },
  ])
  expect(source[0]?.area).toBe('body')
})

it('shows default only when needed and recovers original zones on their return', () => {
  const areas = [{ code: 'main', label: 'Main', admin_span: 16, supports_resource_widgets: true }]
  const orphan = { ...widget(1, 'body', 0), area: 'removed', enabled: false }
  expect(visibleAreas([], []).map((area) => area.code)).toEqual(['default'])
  expect(visibleAreas(areas, []).map((area) => area.code)).toEqual(['main'])
  expect(visibleAreas(areas, [orphan]).map((area) => area.code)).toEqual(['main', 'default'])
  expect(effectiveArea(orphan.area, areas)).toBe('default')
  expect(effectiveArea(orphan.area, [...areas, { ...areas[0]!, code: 'removed' }])).toBe('removed')
  expect(orphan.area).toBe('removed')
})
