import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const DEFAULT_ROOM_ID = 'mindnotes-default-room'
const DEMO_WS_SERVER = 'wss://demos.yjs.dev'

interface UseCollaborationResult {
  doc: Y.Doc | null
  provider: WebsocketProvider | null
  isSynced: boolean
  onlineUsers: number
}

export function useCollaboration(roomId: string = DEFAULT_ROOM_ID): UseCollaborationResult {
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)

  const [isSynced, setIsSynced] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(1)

  useEffect(() => {
    const doc = new Y.Doc()
    const provider = new WebsocketProvider(DEMO_WS_SERVER, roomId, doc)

    docRef.current = doc
    providerRef.current = provider

    const awareness = provider.awareness
    awareness.setLocalStateField('user', {
      clientId: doc.clientID,
      joinedAt: Date.now(),
    })

    const handleSync = (synced: boolean) => {
      setIsSynced(Boolean(synced))
    }

    const handleAwarenessChange = () => {
      const activeUsers = Array.from(awareness.getStates().values()).filter(Boolean).length
      setOnlineUsers(Math.max(activeUsers, 1))
    }

    provider.on('sync', handleSync)
    awareness.on('change', handleAwarenessChange)
    handleAwarenessChange()

    return () => {
      provider.off('sync', handleSync)
      awareness.off('change', handleAwarenessChange)
      provider.destroy()
      doc.destroy()
      providerRef.current = null
      docRef.current = null
      setIsSynced(false)
      setOnlineUsers(1)
    }
  }, [roomId])

  return {
    doc: docRef.current,
    provider: providerRef.current,
    isSynced,
    onlineUsers,
  }
}