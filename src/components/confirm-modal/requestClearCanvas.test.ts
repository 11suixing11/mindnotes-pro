import { describe, expect, it, vi } from 'vitest'
import { requestClearCanvas } from './requestClearCanvas'

describe('requestClearCanvas', () => {
  it('does not confirm or clear an empty canvas', async () => {
    const confirm = vi.fn()
    const clearAll = vi.fn()
    const onEmpty = vi.fn()

    await expect(requestClearCanvas(0, confirm, clearAll, { onEmpty })).resolves.toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(clearAll).not.toHaveBeenCalled()
    expect(onEmpty).toHaveBeenCalledOnce()
  })

  it('leaves the canvas unchanged when confirmation is cancelled', async () => {
    const confirm = vi.fn(async () => false)
    const clearAll = vi.fn(() => true)

    await expect(requestClearCanvas(3, confirm, clearAll)).resolves.toBe(false)
    expect(confirm).toHaveBeenCalledWith('确定清空当前画布吗？当前有 3 个元素。')
    expect(clearAll).not.toHaveBeenCalled()
  })

  it('clears after confirmation and reports success', async () => {
    const confirm = vi.fn(async () => true)
    const clearAll = vi.fn(() => true)
    const onCleared = vi.fn()

    await expect(requestClearCanvas(2, confirm, clearAll, { onCleared })).resolves.toBe(true)
    expect(clearAll).toHaveBeenCalledOnce()
    expect(onCleared).toHaveBeenCalledOnce()
  })
})
