import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FirstRunGuide from './FirstRunGuide'
import { FEEDBACK_DISCUSSION_URL } from '../../productLinks'

describe('FirstRunGuide', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows guide when no guide-seen key exists', () => {
    render(<FirstRunGuide />)
    expect(screen.getByText('欢迎使用 MindNotes Pro')).toBeTruthy()
    expect(screen.getByRole('region', { name: '首次使用引导' })).toBeTruthy()
  })

  it('hides guide when guide-seen key exists', () => {
    localStorage.setItem('mn-guide-seen', '1')
    const { container } = render(<FirstRunGuide />)
    expect(container.firstChild).toBeNull()
  })

  it('shows first step content', () => {
    render(<FirstRunGuide />)
    expect(screen.getByText('🎨')).toBeTruthy()
    expect(screen.getByText(/一个本地优先的白板/)).toBeTruthy()
  })

  it('links to the product feedback discussion', () => {
    render(<FirstRunGuide />)
    expect(screen.getByLabelText('反馈').getAttribute('href')).toBe(FEEDBACK_DISCUSSION_URL)
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

  it('does not close when the non-modal guide shell is clicked', () => {
    render(<FirstRunGuide />)
    fireEvent.click(screen.getByRole('region', { name: '首次使用引导' }))

    expect(localStorage.getItem('mn-guide-seen')).toBeNull()
    expect(screen.getByText('欢迎使用 MindNotes Pro')).toBeTruthy()
  })

  it('shows step indicators', () => {
    const { container } = render(<FirstRunGuide />)
    // Should have 4 step indicators
    const indicators = container.querySelectorAll('.first-run-guide-dot')
    expect(indicators.length).toBe(4)
  })
})
