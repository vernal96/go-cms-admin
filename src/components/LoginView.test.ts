// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginView from './LoginView.vue'

describe('LoginView', () => {
  it('uses the requested login and password placeholders', () => {
    const wrapper = mount(LoginView, { props: { loading: false, errorMessage: null } })
    expect(wrapper.findAll('input').map(input => input.attributes('placeholder'))).toEqual(['Логин', 'Пароль'])
  })
})
