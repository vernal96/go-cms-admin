// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourceIcon from './ResourceIcon.vue'

describe('ResourceIcon', () => {
  it('uses the default icon when the backend icon is missing or empty', () => {
    expect(mount(ResourceIcon, { props: { icon: '' } }).get('i').attributes('class')).toBe('fa-solid fa-file-lines')
    expect(mount(ResourceIcon).get('i').attributes('class')).toBe('fa-solid fa-file-lines')
    expect(mount(ResourceIcon, { props: { icon: ' ' } }).get('i').attributes('class')).toBe('fa-solid fa-file-lines')
  })

  it('builds a solid Font Awesome class from a bare icon name', () => {
    expect(mount(ResourceIcon, { props: { icon: 'building-columns' } }).get('i').attributes('class')).toBe('fa-solid fa-building-columns')
  })
})
