"use client"

import type React from "react"

import { useEffect } from "react"

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

export function AdsenseLoader() {
  useEffect(() => {
    // Load AdSense script
    const script = document.createElement("script")
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4733730200452740"
    script.crossOrigin = "anonymous"
    script.async = true
    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return null
}

export function AdSlot({ slot, style }: { slot: string; style?: React.CSSProperties }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({})
      }
    } catch (e) {
      console.log("AdSense not ready")
    }
  }, [])

  return (
    <div className="ad-container bg-zinc-800/50 rounded-lg p-4 text-center">
      <div className="text-xs text-zinc-500 mb-2">Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          ...style,
        }}
        data-ad-client="ca-pub-4733730200452740"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
