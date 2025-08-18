"use client"

import type React from "react"

import { useState, useCallback } from "react"

type MapStubProps = {
  height: number
  center: { lat: number; lng: number }
  marker?: { lat: number; lng: number; emoji?: string }
  onClick?: (position: { lat: number; lng: number }) => void
  onMarkerMove?: (position: { lat: number; lng: number }) => void
}

export default function MapStub({ height, center, marker, onClick, onMarkerMove }: MapStubProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [markerPos, setMarkerPos] = useState(marker || center)

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !onMarkerMove) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Convert pixel coordinates to lat/lng (rough approximation)
      const lat = center.lat + (rect.height / 2 - y) * 0.001
      const lng = center.lng + (x - rect.width / 2) * 0.001

      const newPos = { lat, lng }
      setMarkerPos(newPos)
      onMarkerMove(newPos)
    },
    [isDragging, onMarkerMove, center],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onClick) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Convert pixel coordinates to lat/lng (rough approximation)
      const lat = center.lat + (rect.height / 2 - y) * 0.001
      const lng = center.lng + (x - rect.width / 2) * 0.001

      onClick({ lat, lng })
    },
    [onClick, center],
  )

  return (
    <div
      className="relative bg-zinc-800 rounded-lg overflow-hidden cursor-crosshair"
      style={{ height: `${height}px` }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid pattern to simulate map */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Center crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-zinc-500">
        <div className="w-4 h-4 border border-zinc-500 rounded-full bg-zinc-700/50" />
      </div>

      {/* Marker */}
      {markerPos && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move"
          style={{
            left: "50%",
            top: "50%",
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="w-10 h-10 bg-white border-4 border-orange-500 rounded-full flex items-center justify-center text-lg shadow-lg">
            {marker?.emoji || "😢"}
          </div>
        </div>
      )}

      {/* Coordinates display */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {markerPos.lat.toFixed(4)}, {markerPos.lng.toFixed(4)}
      </div>

      {/* Instructions */}
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        Click to place • Drag marker to move
      </div>
    </div>
  )
}
