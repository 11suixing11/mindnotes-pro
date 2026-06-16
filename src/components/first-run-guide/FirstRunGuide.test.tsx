import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FirstRunGuide from './FirstRunGuide'

describe('FirstRunGuide', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows guide when no guide-seen key exists', () => {
    render(<FirstRunGuide />)
    expect(screen.getByText('欢迎使用 MindNotes')).toBeTruthy()
  })

  it('hides guide when guide-seen key exists', () => {
    localStorage.setItem('mn-guide-seen', '1')
    const { container } = render(<FirstRunGuide />)
    expect(container.firstChild).toBeNull()
  })

  it('shows first step content', () => {
    render(<FirstRunGuide />)
    expect(screen.getByText('🎨')).toBeTruthy()
    expect(screen.getByText(/一个轻量的本地白板/)).toBeTruthy()
  })

  it('navigates to next step', () => {
    render(<FirstRunGuide />)
    fireEvent.click(screen.getByLabelText('下一步'))
    expect(screen.getByText('画布管理')).toBeTruthy()
    expect(screen.getByText('📂')).toBeTruthy()
  })

  it('navigates through all steps', () => {
    render(<FirstRunGuide />)
    fireEvent.click(screen.getByLabelText('下一步'))
    fireEvent.click(screen.getByLabelText('下一步'))
    expect(screen.getByText('右键菜单')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('下一步'))
    expect(screen.getByText('快捷键')).toBeTruthy()
  })

  it('shows "开始创作" on last step', () => {
    render(<FirstRunGuide />)
    fireEvent.click(screen.getByLabelText('下一步'))
    fireEvent.click(screen.getByLabelText('下一步'))
    fireEvent.click(screen.getByLabelText('下一步'))
    expect(screen.getByLabelText('开始创作')).toBeTruthy()
  })

  it('closes and sets guide-seen on last step confirm', () => {
    render(<FirstRunGuide />)
    // Navigate to last step
    fireEvent.click(screen.getByLabelText('下一步'))
    fireEvent.click(screen.getByLabelText('下一步'))
    fireEvent.click(screen.getByLabelText('下一步'))
    fireEvent.click(screen.getByLabelText('开始创作'))
    expect(localStorage.getItem('mn-guide-seen')).toBe('1')
  })

  it('closes on skip button', () => {
    render(<FirstRunGuide />)
    fireEvent.click(screen.getByLabelText('跳过引导'))
    expect(localStorage.getItem('mn-guide-seen')).toBe('1')
  })

  it('closes on Escape key', () => {
    render(<FirstRunGuide />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(localStorage.getItem('mn-guide-seen')).toBe('1')
  })

  it('closes on overlay click', () => {
    const { container } = render(<FirstRunGuide />)
    const overlay = container.querySelector('[class*="fixed"]')!
    fireEvent.click(overlay)
    expect(localStorage.getItem('mn-guide-seen')).toBe('1')
  })

  it('shows step indicators', () => {
    const { container } = render(<FirstRunGuide />)
    // Should have 4 step indicators
    const indicators = container.querySelectorAll('.rounded-\\[3px\\]')
    expect(indicators.length).toBe(4)
  })
})
