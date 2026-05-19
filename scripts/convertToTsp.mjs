import fs from 'fs'
import path from 'path'
import process from 'process'
import XLSX from 'xlsx'

function usage() {
  console.log('Usage: node scripts/convertToTsp.mjs <input-file>')
  process.exit(1)
}

if (process.argv.length < 3) usage()

const input = process.argv[2]
if (!fs.existsSync(input)) {
  console.error('File not found:', input)
  process.exit(2)
}

const ext = path.extname(input).toLowerCase()

function buildTsp(points, name = 'export') {
  const lines = []
  lines.push(`NAME: ${name}`)
  lines.push('TYPE: TSP')
  lines.push(`COMMENT: Exported ${points.length} points`)
  lines.push(`DIMENSION: ${points.length}`)
  lines.push('EDGE_WEIGHT_TYPE: EUC_2D')
  lines.push('NODE_COORD_SECTION')
  points.forEach((p, i) => {
    const id = i + 1
    const x = Number(p.lng)
    const y = Number(p.lat)
    lines.push(`${id} ${x.toFixed(6)} ${y.toFixed(6)}`)
  })
  lines.push('EOF')
  return lines.join('\n')
}

function parseRowsToPoints(rows) {
  const points = []
  for (const r of rows) {
    // row may be object (xlsx) or array (csv)
    if (Array.isArray(r)) {
      const last = r.length - 1
      const lat = parseFloat(r[last - 1])
      const lng = parseFloat(r[last])
      if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng })
    } else if (typeof r === 'object' && r !== null) {
      // try to find lat/lng keys
      const keys = Object.keys(r)
      const latKey = keys.find((k) => /lat/i.test(k))
      const lngKey = keys.find((k) => /lon|lng|long/i.test(k))
      if (latKey && lngKey) {
        const lat = parseFloat(r[latKey])
        const lng = parseFloat(r[lngKey])
        if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng })
      } else {
        // fallback: look for last two numeric columns
        const vals = keys.map((k) => ({ k, v: parseFloat(r[k]) })).filter((x) => !isNaN(x.v))
        if (vals.length >= 2) {
          const lat = vals[vals.length - 2].v
          const lng = vals[vals.length - 1].v
          points.push({ lat, lng })
        }
      }
    }
  }
  return points
}

let rows = []
if (ext === '.xlsx' || ext === '.xls') {
  const wb = XLSX.readFile(input)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
} else {
  // treat as text table: detect delimiter (tab or comma)
  const text = fs.readFileSync(input, 'utf8')
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    console.error('No rows found in input')
    process.exit(3)
  }
  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const header = lines[0].split(delimiter).map((h) => h.trim())
  const dataLines = lines.slice(1)
  rows = dataLines.map((ln) => ln.split(delimiter).map((c) => c.trim()))
  // If header has LAT/LONG columns, convert to objects for parsing
  if (header.some((h) => /lat/i.test(h)) && header.some((h) => /lon|lng|long/i.test(h))) {
    rows = dataLines.map((ln) => {
      const cols = ln.split(delimiter).map((c) => c.trim())
      const obj = {}
      header.forEach((h, i) => { obj[h] = cols[i] })
      return obj
    })
  }
}

const points = parseRowsToPoints(rows)
if (points.length === 0) {
  console.error('No coordinate pairs found in input')
  process.exit(4)
}

const base = path.basename(input, ext)
const outName = `${base}.tsp`
const tspText = buildTsp(points, base)
fs.writeFileSync(outName, tspText, 'utf8')
console.log(`Wrote ${outName} with ${points.length} points`)
process.exit(0)
