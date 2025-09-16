"use client"
import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const controller = new AbortController()
    const { signal } = controller

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/', type: 'classic' })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('SW registration failed', err)
      }
    }

    register()

    return () => controller.abort()
  }, [])

  return null
}


