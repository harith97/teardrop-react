"use client"

import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api"
import { useState, useCallback, useEffect } from "react"
// import { google } from "googlemaps"

// Declare global google maps types
declare global {
  interface Window {
    google: {
      maps: {
        Map: any
        Size: any
        MapMouseEvent: any
        ControlPosition: {
          RIGHT_CENTER: number
        }
      }
    }
  }
}

export type GMapMarker = {
  id: string
  lat: number
  lng: number
  emoji: string
  title?: string
  markerType?: "cry" | "current-location"
}

type GoogleMapViewProps = {
  apiKey: string
  center: { lat: number; lng: number }
  height: number | string
  zoom?: number
  markers?: GMapMarker[]
  singleMarker?: { lat: number; lng: number; emoji: string }
  draggable?: boolean
  onMarkerClick?: (id: string) => void
  onMapClick?: (position: { lat: number; lng: number }) => void
  onMarkerDrag?: (position: { lat: number; lng: number }) => void
}

const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
]

function createCryIcon(emoji: string, markerType: "cry" | "current-location" = "cry") {
  const colors = {
    cry: { fill: "white", stroke: "#FF6B35" },
    "current-location": { fill: "#3B82F6", stroke: "#1E40AF" }
  }
  
  const color = colors[markerType]
  
  if (markerType === "current-location") {
    // Create a blue dot marker for current location
    const svg = `
      <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="8" fill="${color.fill}" stroke="${color.stroke}" strokeWidth="2"/>
        <circle cx="20" cy="20" r="4" fill="white"/>
      </svg>
    `
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  }
  
  // Create emoji marker for cries
  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${color.fill}" stroke="${color.stroke}" strokeWidth="3"/>
      <text 
        x="10" 
        y="26" 
        fontSize="18" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontFamily="Arial, sans-serif"
        fill="black">${emoji}</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export default function GoogleMapView({
  apiKey,
  center,
  height,
  zoom = 12,
  markers = [],
  singleMarker,
  draggable = false,
  onMarkerClick,
  onMapClick,
  onMarkerDrag,
}: GoogleMapViewProps) {
  const [currentOrigin, setCurrentOrigin] = useState<string>("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin)
    }
  }, [])

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  })

  const onLoad = useCallback((map: any) => {
    // Map is ready
  }, [])

  const onUnmount = useCallback(() => {
    // Cleanup
  }, [])

  const handleMapClick = useCallback(
    (e: any) => {
      if (e.latLng && onMapClick) {
        onMapClick({
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        })
      }
    },
    [onMapClick],
  )

  const handleMarkerDragEnd = useCallback(
    (e: any) => {
      if (e.latLng && onMarkerDrag) {
        onMarkerDrag({
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        })
      }
    },
    [onMarkerDrag],
  )

  if (loadError) {
    return (
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        <div className="text-red-500 text-lg mb-4">⚠️ Google Maps Error</div>
        <div className="text-zinc-300 mb-4">
          <strong>RefererNotAllowedMapError</strong>
          <br />
          Your API key needs to allow this domain.
        </div>

        <div className="bg-zinc-800 rounded-md p-4 mb-4 text-left">
          <div className="text-sm font-semibold mb-2">Add these to your Google Maps API key:</div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Current origin:</span>
              <code className="bg-zinc-700 px-2 py-1 rounded text-orange-400">{currentOrigin}/*</code>
              <button
                onClick={() => navigator.clipboard.writeText(`${currentOrigin}/*`)}
                className="text-blue-400 hover:text-blue-300"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">All v0 previews:</span>
              <code className="bg-zinc-700 px-2 py-1 rounded text-orange-400">https://*.vusercontent.net/*</code>
              <button
                onClick={() => navigator.clipboard.writeText("https://*.vusercontent.net/*")}
                className="text-blue-400 hover:text-blue-300"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Local dev:</span>
              <code className="bg-zinc-700 px-2 py-1 rounded text-orange-400">http://localhost:3000/*</code>
              <button
                onClick={() => navigator.clipboard.writeText("http://localhost:3000/*")}
                className="text-blue-400 hover:text-blue-300"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-zinc-500 mb-4">
          Go to Google Cloud Console → APIs & Services → Credentials → Your Maps API Key → Application restrictions →
          HTTP referrers
        </div>

        <button
          onClick={() => window.location.reload()}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Retry loading map
        </button>

        {/* Fallback interactive placeholder */}
        <div className="mt-4 p-4 bg-zinc-800 rounded-md">
          <div className="text-zinc-400 text-sm mb-2">Interactive Placeholder (click to place cry)</div>
          <div
            className="bg-zinc-700 rounded cursor-pointer hover:bg-zinc-600 transition-colors flex items-center justify-center"
            style={{ height: "200px" }}
            onClick={() => onMapClick && onMapClick(center)}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <div className="text-zinc-300">Click to place cry here</div>
              <div className="text-xs text-zinc-500 mt-1">
                Lat: {center.lat.toFixed(4)}, Lng: {center.lng.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">🗺️</div>
          <div className="text-zinc-400">Loading map...</div>
        </div>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
      }}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={{
        styles: mapStyles,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: 9, // RIGHT_CENTER position
        },
      }}
    >
      {/* Regular markers */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={{ lat: marker.lat, lng: marker.lng }}
          title={marker.title}
          icon={{
            url: createCryIcon(marker.emoji, marker.markerType),
            scaledSize: new window.google.maps.Size(40, 40),
          }}
          onClick={() => onMarkerClick?.(marker.id)}
        />
      ))}

      {/* Single draggable marker */}
      {singleMarker && (
        <Marker
          position={{ lat: singleMarker.lat, lng: singleMarker.lng }}
          draggable={draggable}
          onDragEnd={handleMarkerDragEnd}
          icon={{
            url: createCryIcon(singleMarker.emoji, "cry"),
            scaledSize: new window.google.maps.Size(40, 40),
          }}
        />
      )}
    </GoogleMap>
  )
}
