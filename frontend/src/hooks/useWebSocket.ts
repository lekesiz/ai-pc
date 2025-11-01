import { useEffect } from 'react'
import { wsService } from '@/services/websocketService'
import { useAuthStore } from '@/stores/authStore'

export function useWebSocket() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      wsService.connect()
    } else {
      wsService.disconnect()
    }

    return () => {
      // Cleanup handled by service
    }
  }, [isAuthenticated])

  return wsService
}