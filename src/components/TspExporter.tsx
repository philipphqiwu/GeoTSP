import React from 'react'
import type { IndexedPoint } from '../types/geo'

function buildTspText(points: IndexedPoint[]) {
  const lines: string[] = []
  lines.push('NAME: geotsp-export')
  lines.push('TYPE: TSP')
  lines.push(`COMMENT: Exported ${points.length} points from GeoTSP`)
  lines.push(`DIMENSION: ${points.length}`)
  lines.push('EDGE_WEIGHT_TYPE: EUC_2D')
  lines.push('NODE_COORD_SECTION')

  points.forEach((p, i) => {
    // TSPLIB uses: id x y -- we write x=lng, y=lat so loader remains compatible
    const id = i + 1
    const x = p.lng
    const y = p.lat
    lines.push(`${id} ${x.toFixed(6)} ${y.toFixed(6)}`)
  })

  lines.push('EOF')
  return lines.join('\n')
}

export default function TspExporter({ points }: { points: IndexedPoint[] }) {
  const onExport = () => {
    if (!points || points.length === 0) {
      window.alert('No points to export')
      return
    }
    const text = buildTspText(points)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'geotsp-export.tsp'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="tsp-exporter">
      <button type="button" onClick={onExport}>
        Export .tsp
      </button>
    </div>
  )
}
