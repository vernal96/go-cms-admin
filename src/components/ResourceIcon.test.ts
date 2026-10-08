// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourceIcon from './ResourceIcon.vue'

describe('ResourceIcon', () => {
  it('uses the default only for an empty backend icon string', () => {
    expect(mount(ResourceIcon, { props: { icon: '' } }).get('i').attributes('class')).toBe('fa-solid fa-file-lines')
    expect(mount(ResourceIcon).get('i').attributes('class')).toBe('fa-solid fa-file-lines')
  })

  it('passes arbitrary nonempty backend icon classes through without mapping or normalization', () => {
    const icon = 'fa-brands fa-vk arbitrary-backend-class'
    expect(mount(ResourceIcon, { props: { icon } }).get('i').attributes('class')).toBe(icon)
    expect(mount(ResourceIcon, { props: { icon: ' ' } }).get('i').classes()).not.toContain('fa-file-lines')
  })
})
