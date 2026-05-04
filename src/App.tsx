import { useEffect, useMemo, useRef, useState } from 'react'
import L, { type LeafletMouseEvent, type Map as LeafletMap } from 'leaflet'
import './App.css'
import { solveNearestNeighborTsp } from './lib/tsp'
import type { IndexedPoint, TspRoute } from './types/geo'

const INITIAL_CENTER: [number, number] = [20, 0]
const INITIAL_ZOOM = 2

function App() {
  const [points, setPoints] = useState<IndexedPoint[]>([])
  const [route, setRoute] = useState<TspRoute | null>(null)
  const nextIdRef = useRef(1)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)

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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

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

  useEffect(() => {
    if (!markerLayerRef.current || !routeLayerRef.current) {
      return
    }

    markerLayerRef.current.clearLayers()
    routeLayerRef.current.clearLayers()

    points.forEach((point) => {
      L.circleMarker([point.lat, point.lng], {
        color: '#d64550',
        fillColor: '#ff5e5b',
        fillOpacity: 0.85,
        weight: 2,
        radius: 7,
      })
        .bindTooltip(`P${point.id}: ${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`, {
          direction: 'top',
          offset: [0, -8],
        })
        .addTo(markerLayerRef.current as L.LayerGroup)
    })

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
    const result = solveNearestNeighborTsp(pointCoordinates)
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

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>Multi-Scale Geo TSP Visualizer</h1>
          <p className="subtitle">
            MVP: Global mode using geodesic distance + nearest-neighbor heuristic
          </p>
        </div>
        <span className="mode-pill">Global Mode</span>
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

        <div className="stats" aria-live="polite">
          <span>Points: {points.length}</span>
          <span>
            Length:{' '}
            {route ? `${route.totalDistanceKm.toFixed(1)} km` : 'Add points and solve'}
          </span>
        </div>
      </section>

      <section className="map-wrapper">
        <div id="tsp-map" className="map-canvas" />
      </section>

      <footer className="hint">
        Click on the map to add points, then compute a round-trip route.
      </footer>
    </main>
  )
}

export default App
