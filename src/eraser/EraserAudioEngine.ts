import type { EraserPoint, EraserShape, EraserConfig } from './types'

/**
 * 橡皮擦音效引擎
 * 使用 Web Audio API 生成实时擦除音效
 * - 压力 → 音量
 * - 速度 → 频率
 * - 形状 → 音色
 * - 磨损 → 低通滤波
 */
export class EraserAudioEngine {
  private audioContext: AudioContext | null = null
  private oscillator: OscillatorNode | null = null
  private gainNode: GainNode | null = null
  private filterNode: BiquadFilterNode | null = null
  
  private isPlaying: boolean = false
  private config: EraserConfig
  private audioEnabled: boolean = true

  constructor(config: EraserConfig) {
    this.config = config
    this.audioEnabled = config.audioEnabled ?? true
  }

  updateConfig(config: Partial<EraserConfig>): void {
    this.config = { ...this.config, ...config }
    if (config.audioEnabled !== undefined) {
      this.audioEnabled = config.audioEnabled
    }
  }

  /**
   * 初始化音频上下文（懒加载，第一次使用时初始化）
   */
  private initAudio(): void {
    if (this.audioContext) return
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.warn('Web Audio API not supported, eraser audio disabled')
      this.audioEnabled = false
    }
  }

  /**
   * 根据橡皮擦形状选择波形类型
   */
  private getWaveformForShape(shape: EraserShape): OscillatorType {
    switch (shape) {
      case 'circle':
        return 'sine'      // 圆形：柔和正弦波
      case 'square':
        return 'square'    // 方形：硬朗方波
      case 'chisel':
        return 'sawtooth'  // 凿形：粗糙锯齿波
      default:
        return 'sine'
    }
  }

  /**
   * 根据磨损程度计算低通滤波频率
   * 磨损越大，频率越低（声音越低沉）
   */
  private getFilterFrequency(wearLevel: number): number {
    // 全新：8000Hz，完全磨损：2000Hz
    return 8000 - wearLevel * 6000
  }

  /**
   * 根据速度计算频率
   * 速度越快，频率越高
   */
  private getFrequencyForVelocity(velocity: number): number {
    // 基准频率 200Hz，速度每增加1px/ms，频率增加50Hz
    // 范围：100Hz - 800Hz
    const baseFreq = 200
    const freq = baseFreq + velocity * 50
    return Math.max(100, Math.min(800, freq))
  }

  /**
   * 根据压力计算音量
   * 压力越大，音量越大
   */
  private getVolumeForPressure(pressure: number): number {
    // 音量范围：0.01 - 0.15（避免太大声）
    const minVol = 0.01
    const maxVol = 0.15
    return minVol + pressure * (maxVol - minVol)
  }

  /**
   * 开始擦除音效
   */
  startErase(point: EraserPoint, wearLevel: number): void {
    if (!this.audioEnabled) return
    
    this.initAudio()
    if (!this.audioContext) return

    // 如果已经在播放，先停止
    this.stopErase()

    try {
      // 创建音频节点
      this.oscillator = this.audioContext.createOscillator()
      this.gainNode = this.audioContext.createGain()
      this.filterNode = this.audioContext.createBiquadFilter()

      // 设置波形（根据形状）
      this.oscillator.type = this.getWaveformForShape(this.config.shape)

      // 设置低通滤波（根据磨损）
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.value = this.getFilterFrequency(wearLevel)

      // 设置初始频率和音量
      this.oscillator.frequency.value = this.getFrequencyForVelocity(point.velocity)
      this.gainNode.gain.value = this.getVolumeForPressure(point.pressure)

      // 连接节点：振荡器 → 滤波器 → 音量 → 输出
      this.oscillator.connect(this.filterNode)
      this.filterNode.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)

      // 淡入（避免爆音）
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      this.gainNode.gain.linearRampToValueAtTime(
        this.getVolumeForPressure(point.pressure),
        this.audioContext.currentTime + 0.05
      )

      this.oscillator.start()
      this.isPlaying = true
    } catch (e) {
      console.warn('Failed to start eraser audio:', e)
      this.stopErase()
    }
  }

  /**
   * 更新擦除音效参数（移动时实时调整）
   */
  updateErase(point: EraserPoint, wearLevel: number): void {
    if (!this.isPlaying || !this.audioEnabled) return
    if (!this.oscillator || !this.gainNode || !this.filterNode || !this.audioContext) return

    try {
      // 实时更新频率（速度）
      const targetFreq = this.getFrequencyForVelocity(point.velocity)
      this.oscillator.frequency.setTargetAtTime(
        targetFreq,
        this.audioContext.currentTime,
        0.02  // 平滑时间常数
      )

      // 实时更新音量（压力）
      const targetVol = this.getVolumeForPressure(point.pressure)
      this.gainNode.gain.setTargetAtTime(
        targetVol,
        this.audioContext.currentTime,
        0.02
      )

      // 实时更新滤波（磨损）
      const targetFilter = this.getFilterFrequency(wearLevel)
      this.filterNode.frequency.setTargetAtTime(
        targetFilter,
        this.audioContext.currentTime,
        0.1
      )
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 停止擦除音效
   */
  stopErase(): void {
    if (!this.isPlaying) return

    try {
      if (this.gainNode && this.audioContext) {
        // 淡出（避免爆音）
        this.gainNode.gain.linearRampToValueAtTime(
          0,
          this.audioContext.currentTime + 0.1
        )
      }

      // 延迟停止振荡器，让淡出完成
      setTimeout(() => {
        try {
          this.oscillator?.stop()
        } catch (e) {
          // 可能已经停止了
        }
        this.oscillator?.disconnect()
        this.gainNode?.disconnect()
        this.filterNode?.disconnect()
        this.oscillator = null
        this.gainNode = null
        this.filterNode = null
        this.isPlaying = false
      }, 150)
    } catch (e) {
      this.oscillator = null
      this.gainNode = null
      this.filterNode = null
      this.isPlaying = false
    }
  }

  /**
   * 播放"削橡皮"音效
   */
  playSharpenSound(): void {
    if (!this.audioEnabled) return
    
    this.initAudio()
    if (!this.audioContext) return

    try {
      // 创建一个短暂的刮擦声
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(400, this.audioContext.currentTime)
      osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.15)

      gain.gain.setValueAtTime(0, this.audioContext.currentTime)
      gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.05)
      gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.15)

      osc.connect(gain)
      gain.connect(this.audioContext.destination)

      osc.start()
      osc.stop(this.audioContext.currentTime + 0.2)
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 销毁音频引擎
   */
  destroy(): void {
    this.stopErase()
    this.audioContext?.close()
    this.audioContext = null
  }

  /**
   * 检查音效是否启用
   */
  isAudioEnabled(): boolean {
    return this.audioEnabled
  }
}
