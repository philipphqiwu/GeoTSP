# GeoTSP

GeoTSP is an interactive Traveling Salesman Problem visualizer for geographic points. You can place points manually on the map or add cities from a country picker, then compute an optimized round-trip route.

## Tech Stack

- Vite
- React
- TypeScript
- Leaflet (direct API usage)

## Quick Start

### Prerequisites

- Node.js 18+

### Run

```bash
npm install
npm run dev
```

Vite will print the local URL in terminal (commonly http://localhost:5173).

### Other Commands

```bash
npm run build
npm run preview
npm run lint
```

## Features

- Interactive world map with click-to-add points
- Country and city picker backed by a local city database
- Multiple map tile modes:
  - Map (OpenStreetMap)
  - Satellite (Esri World Imagery)
  - Terrain (OpenTopoMap)
- Right-click on a marker to remove a specific point
- Route stats display:
  - Number of points
  - Total route length in km
  - Optimal start marker label

## Routing Algorithm

Route solving uses a two-stage heuristic pipeline:

1. Multi-start nearest-neighbor to generate candidate tours from different start points
2. 2-opt local optimization to reduce crossings and shorten path length

The solver returns the best candidate route found and tracks the best starting point index.

## Data Model

- City coordinates are stored in a local typed database
- Countries are selected by ISO-style country code
- Selecting a country loads its city list into the city picker
- Adding a city inserts it as a new point in the active route set

## Current Project Structure

```text
src/
  data/
    cityDatabase.ts      # Country -> city coordinates database
  lib/
    graph.ts             # Distance helpers
    tsp.ts               # Multi-start nearest-neighbor + 2-opt solver
  types/
    geo.ts               # Shared route and point types
  App.tsx                # Main UI and map logic
  App.css                # Component styles
  main.tsx               # App bootstrap
```

## Usage Flow

1. Add points by clicking on the map, or choose a country and city then click Add City
2. Click Compute TSP Route
3. Inspect the rendered closed route and distance
4. Optionally switch tile mode or remove points and re-run
