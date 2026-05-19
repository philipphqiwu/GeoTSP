export interface TspResult {
  numVertices: number
  edges: number[][]
  positions: { x: number; y: number }[]
}

export function parseTspFile(text: string): TspResult | null {
  const lines = text.split(/\r?\n/)
  let inCoords = false
  const coords: { id: number; x: number; y: number }[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (/^NODE_COORD_SECTION/i.test(line)) {
      inCoords = true
      continue
    }
    if (/^EOF/i.test(line) || /^(NAME|TYPE|COMMENT|DIMENSION|EDGE_WEIGHT_TYPE|EDGE_WEIGHT_FORMAT|DISPLAY_DATA_TYPE):/i.test(line)) {
      if (inCoords && /^EOF/i.test(line)) break
      if (inCoords) continue
      continue
    }
    if (inCoords) {
      const parts = line.split(/\s+/)
      if (parts.length < 3) continue
      const id = parseInt(parts[0])
      const x = parseFloat(parts[1])
      const y = parseFloat(parts[2])
      if (isNaN(id) || isNaN(x) || isNaN(y)) continue
      coords.push({ id, x, y })
    }
  }

  if (coords.length < 2) return null

  const sorted = [...coords].sort((a, b) => a.id - b.id)
  const n = sorted.length
  const edgeLines: number[][] = []

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = sorted[i].x - sorted[j].x
      const dy = sorted[i].y - sorted[j].y
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100
      edgeLines.push([i, j, dist])
    }
  }

  return {
    numVertices: n,
    edges: edgeLines,
    positions: sorted.map((c) => ({ x: c.x, y: c.y })),
  }
}
