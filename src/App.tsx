import { useEffect, useMemo, useRef, useState } from 'react'
import L, { type LeafletMouseEvent, type Map as LeafletMap } from 'leaflet'
import './App.css'
import { solveOptimizedTsp } from './lib/tsp'
import type { IndexedPoint, TspRoute } from './types/geo'
import TspLoader from './components/TspLoader'
import TspExporter from './components/TspExporter'
import type { TspResult } from './lib/tspLoader'
import { CITY_DATABASE } from './data/cityDatabase'

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

  const [countries, setCountries] = useState<Array<{code:string; name:string}>>([
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
  ])
  const [cities, setCities] = useState<Array<{id:number; name:string; lat:number; lng:number}>>([
    { id: 1, name: 'New York', lat: 40.7128, lng: -74.0060 },
    { id: 2, name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { id: 3, name: 'Chicago', lat: 41.8781, lng: -87.6298 },
    { id: 4, name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  ])
  const [selectedCountry, setSelectedCountry] = useState<string>('US')
  const [selectedCity, setSelectedCity] = useState<string>('1')

  const ALL_COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'JP', name: 'Japan' },
    { code: 'CN', name: 'China' },
    { code: 'IN', name: 'India' },
    { code: 'BR', name: 'Brazil' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'MX', name: 'Mexico' },
    { code: 'KR', name: 'South Korea' },
    { code: 'RU', name: 'Russia' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'SE', name: 'Sweden' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'SG', name: 'Singapore' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'TH', name: 'Thailand' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'PH', name: 'Philippines' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'TR', name: 'Turkey' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'PE', name: 'Peru' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'EG', name: 'Egypt' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'KE', name: 'Kenya' },
    { code: 'GR', name: 'Greece' },
    { code: 'PT', name: 'Portugal' },
    { code: 'PL', name: 'Poland' },
    { code: 'BE', name: 'Belgium' },
    { code: 'AT', name: 'Austria' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'NO', name: 'Norway' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IL', name: 'Israel' },
    { code: 'PS', name: 'Palestine' },
  ]

  useEffect(() => {
    // Use local comprehensive countries list (reference data, not hardcoded city data)
    setCountries(ALL_COUNTRIES)
  }, [])

  // When the selected country changes, update cities from database
  useEffect(() => {
    if (!selectedCountry) return
    
    const cities = CITY_DATABASE[selectedCountry] || CITY_DATABASE['US'] || []
    setCities(cities)
    if (cities.length > 0) setSelectedCity(String(cities[0].id))
  }, [selectedCountry])

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

  const handleTspParsed = (result: TspResult) => {
    // Detect whether parsed coords look like geographic degrees.
    const xs = result.positions.map((p) => p.x)
    const ys = result.positions.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const looksLikeDegrees = (valX: number, valY: number) => {
      // lat in [-90,90], lng in [-180,180]
      return valY >= -90 && valY <= 90 && valX >= -180 && valX <= 180
    }

    let mapped: { x: number; y: number }[] = result.positions

    if (!looksLikeDegrees(xs[0], ys[0]) || xs.some((v) => Math.abs(v) > 180) || ys.some((v) => Math.abs(v) > 90)) {
      // Treat as planar coordinates (e.g., TSPLIB EUC_2D). Map to a reasonable Berlin bbox.
      const latMin = 52.30
      const latMax = 52.80
      const lngMin = 13.00
      const lngMax = 13.80

      const spanX = maxX - minX || 1
      const spanY = maxY - minY || 1

      mapped = result.positions.map((p) => ({
        x: lngMin + ((p.x - minX) / spanX) * (lngMax - lngMin),
        y: latMin + ((p.y - minY) / spanY) * (latMax - latMin),
      }))
      // Informative console message; keep UI unobtrusive
      console.info('TSP loader: planar coordinates detected and normalized to Berlin bbox')
    } else {
      // Likely already degrees: map x=>lng, y=>lat
      mapped = result.positions.map((p) => ({ x: p.x, y: p.y }))
    }

    setPoints((current) => {
      const pts = mapped.map((p) => ({ id: nextIdRef.current++, lat: p.y, lng: p.x }))
      return [...current, ...pts]
    })
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

        <div className="city-picker">
          <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <button type="button" onClick={() => {
            const city = cities.find((c) => String(c.id) === selectedCity)
            if (!city) return
            setPoints((current) => {
              const point = { id: nextIdRef.current, lat: city.lat, lng: city.lng }
              nextIdRef.current += 1
              return [...current, point]
            })
            setRoute(null)
          }}>📍 Add City</button>
        </div>

        <TspLoader onParse={handleTspParsed} />
        <TspExporter points={points} />

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
