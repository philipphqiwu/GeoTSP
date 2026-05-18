import { useEffect, useMemo, useRef, useState } from 'react'
import L, { type LeafletMouseEvent, type Map as LeafletMap } from 'leaflet'
import './App.css'
import { solveOptimizedTsp } from './lib/tsp'
import type { IndexedPoint, TspRoute } from './types/geo'

type MapViewType = 'map' | 'satellite' | 'terrain'

const TILE_LAYERS: Record<MapViewType, { url: string; attribution: string }> = {
  map: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DigitalGlobe, Earthstar Geographics, and others',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
  },
}

const INITIAL_CENTER: [number, number] = [20, 0]
const INITIAL_ZOOM = 2

function App() {
  const [points, setPoints] = useState<IndexedPoint[]>([])
  const [route, setRoute] = useState<TspRoute | null>(null)
  const nextIdRef = useRef(1)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
    const tileLayerRef = useRef<L.TileLayer | null>(null)
    const [mapViewType, setMapViewType] = useState<MapViewType>('map')

  const pointCoordinates = useMemo(
    () => points.map(({ lat, lng }) => ({ lat, lng })),
    [points],
  )

  useEffect(() => {
    if (mapRef.current) {
      return
    }

    const map = L.map('tsp-map', { worldCopyJump: true }).setView(
      INITIAL_CENTER,
      INITIAL_ZOOM,
    )

    const initial = L.tileLayer(TILE_LAYERS.map.url, {
      attribution: TILE_LAYERS.map.attribution,
      maxZoom: 19,
    }).addTo(map)
    tileLayerRef.current = initial

    markerLayerRef.current = L.layerGroup().addTo(map)
    routeLayerRef.current = L.layerGroup().addTo(map)

    map.on('click', (event: LeafletMouseEvent) => {
      setPoints((current) => {
        const point = { id: nextIdRef.current, lat: event.latlng.lat, lng: event.latlng.lng }
        nextIdRef.current += 1
        return [...current, point]
      })
      setRoute(null)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerLayerRef.current = null
      routeLayerRef.current = null
    }
  }, [])

  // Switch tile layers when view changes
  useEffect(() => {
    if (!mapRef.current) return

    if (tileLayerRef.current) {
      try {
        mapRef.current.removeLayer(tileLayerRef.current)
      } catch (e) {
        // ignore
      }
      tileLayerRef.current = null
    }

    const def = TILE_LAYERS[mapViewType]
    const tile = L.tileLayer(def.url, { attribution: def.attribution, maxZoom: 19 })
    tile.addTo(mapRef.current)
    tileLayerRef.current = tile
  }, [mapViewType])

  // Update markers and route visualization
  useEffect(() => {
    if (!markerLayerRef.current || !routeLayerRef.current) {
      return
    }

    markerLayerRef.current.clearLayers()
    routeLayerRef.current.clearLayers()

    // Draw user-placed markers
    points.forEach((point) => {
      const isOptimalStart = route && route.bestStartIndex === points.findIndex((p) => p.id === point.id)
      const marker = L.circleMarker([point.lat, point.lng], {
        color: isOptimalStart ? '#ffd700' : '#d64550',
        fillColor: isOptimalStart ? '#ffed4e' : '#ff5e5b',
        fillOpacity: 0.85,
        weight: isOptimalStart ? 3 : 2,
        radius: isOptimalStart ? 9 : 7,
      })
        .bindTooltip(
          `${isOptimalStart ? '⭐ Optimal Start: ' : ''}P${point.id}: ${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}\n(right-click to remove)`,
          {
            direction: 'top',
            offset: [0, -8],
          },
        )
        .addTo(markerLayerRef.current as L.LayerGroup)

      // Right-click to remove
      marker.on('contextmenu', (e) => {
        e.originalEvent.preventDefault()
        handleRemovePoint(point.id)
      })
    })

    // Draw route polyline
    if (route) {
      const routePolyline = route.closedOrder.map((index) => {
        const point = points[index]
        return [point.lat, point.lng] as [number, number]
      })

      L.polyline(routePolyline, {
        color: '#1f4d3f',
        weight: 4,
        opacity: 0.9,
      }).addTo(routeLayerRef.current)
    }
  }, [points, route])

  const handleSolve = () => {
    const result = solveOptimizedTsp(pointCoordinates)
    setRoute(result)
  }

  const handleClear = () => {
    setPoints([])
    setRoute(null)
    nextIdRef.current = 1
  }

  const handleRemoveLast = () => {
    setPoints((current) => current.slice(0, -1))
    setRoute(null)
  }

  const handleRemovePoint = (pointId: number) => {
    setPoints((current) => current.filter((p) => p.id !== pointId))
    setRoute(null)
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>Geo TSP Solver</h1>
          <p className="subtitle">Click on the map to add points, then compute the optimal round-trip route</p>
        </div>
      </header>

      <section className="controls">
        <button type="button" onClick={handleSolve} disabled={points.length < 2}>
          Compute TSP Route
        </button>
        <button type="button" onClick={handleRemoveLast} disabled={points.length === 0}>
          Remove Last Point
        </button>
        <button type="button" onClick={handleClear} disabled={points.length === 0}>
          Clear All
        </button>

        <div className="view-buttons">
          {(['map', 'satellite', 'terrain'] as MapViewType[]).map((view) => (
            <button
              key={view}
              type="button"
              className={mapViewType === view ? 'active' : ''}
              onClick={() => setMapViewType(view)}
            >
              {view === 'map' && '🗺️ Map'}
              {view === 'satellite' && '🛰️ Sat'}
              {view === 'terrain' && '⛰️ Terrain'}
            </button>
          ))}
        </div>

        <div className="stats" aria-live="polite">
          <span>Points: {points.length}</span>
          <span>
            Length:{' '}
            {route ? `${route.totalDistanceKm.toFixed(1)} km` : 'Add points and solve'}
          </span>
          {route && route.bestStartIndex !== undefined && (
            <span>Optimal Start: P{points[route.bestStartIndex]?.id || '?'}</span>
          )}
        </div>
      </section>

      <section className="map-wrapper">
        <div id="tsp-map" className="map-canvas" />
      </section>

      <footer className="hint">
        Click on the map to add points. Right-click a point to remove it. Compute a round-trip route using nearest-neighbor heuristic + 2-opt optimization.
      </footer>
    </main>
  )
}

export default App
