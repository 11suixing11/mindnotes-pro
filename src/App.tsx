import { useEffect } from 'react'
import KnowledgeBase from './components/KnowledgeBase'
import { useThemeStore } from './store/useThemeStore'

export default function App() {
  const { initTheme } = useThemeStore()
  useEffect(() => { initTheme() }, [initTheme])
  return <KnowledgeBase />
}
