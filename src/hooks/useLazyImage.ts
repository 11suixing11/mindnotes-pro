import { useState, useEffect, useRef } from 'react'

interface LazyImageOptions {
  rootMargin?: string
  threshold?: number
  placeholder?: string
}

/**
 * 图片懒加载 Hook
 * 使用 Intersection Observer API 实现
 * 
 * @param src - 图片真实地址
 * @param options - 配置选项
 * @returns { src, isLoaded, isInView, ref }
 */
export function useLazyImage(
  src: string,
  options: LazyImageOptions = {}
) {
  const {
    rootMargin = '50px',
    threshold = 0,
    placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  } = options

  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // 如果浏览器不支持 Intersection Observer，直接加载
    if (!('IntersectionObserver' in window)) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin,
        threshold
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  // 当图片进入视野时，开始加载
  useEffect(() => {
    if (isInView && src) {
      const img = new Image()
      img.src = src
      img.onload = () => setIsLoaded(true)
      img.onerror = () => setIsLoaded(true) // 即使失败也标记为完成
    }
  }, [isInView, src])

  return {
    src: isInView ? src : placeholder,
    isLoaded,
    isInView,
    ref: imgRef
  }
}
