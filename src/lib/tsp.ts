import { haversineDistanceKm } from './graph'
import type { LatLng, TspRoute } from '../types/geo'

type DistanceFn = (from: LatLng, to: LatLng) => number

export const calculateTourDistance = (
  order: number[],
  points: LatLng[],
  distanceFn: DistanceFn = haversineDistanceKm,
): number => {
  let totalDistanceKm = 0
  for (let i = 0; i < order.length; i += 1) {
    const from = points[order[i]]
    const to = points[order[(i + 1) % order.length]]
    totalDistanceKm += distanceFn(from, to)
  }
  return totalDistanceKm
}

export const solveNearestNeighborTsp = (
  points: LatLng[],
  startIndex = 0,
  distanceFn: DistanceFn = haversineDistanceKm,
): TspRoute | null => {
  if (points.length < 2) {
    return null
  }

  const visited = new Set<number>()
  const order: number[] = [startIndex]
  visited.add(startIndex)

  while (order.length < points.length) {
    const current = order[order.length - 1]
    let nearestIndex = -1
    let nearestDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i < points.length; i += 1) {
      if (visited.has(i)) {
        continue
      }

      const distance = distanceFn(points[current], points[i])
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    if (nearestIndex === -1) {
      return null
    }

    visited.add(nearestIndex)
    order.push(nearestIndex)
  }

  const closedOrder = [...order, startIndex]
  const totalDistanceKm = calculateTourDistance(order, points, distanceFn)

  return {
    order,
    closedOrder,
    totalDistanceKm,
  }
}

export const improve2OptTsp = (
  order: number[],
  points: LatLng[],
  maxIterations = 1000,
  distanceFn: DistanceFn = haversineDistanceKm,
): number[] => {
  let improved = [...order]
  let improved_count = 0

  for (let iteration = 0; iteration < maxIterations && improved_count < order.length; iteration += 1) {
    improved_count = 0

    for (let i = 0; i < improved.length - 2; i += 1) {
      for (let k = i + 2; k < improved.length; k += 1) {
        const a = improved[i]
        const b = improved[i + 1]
        const c = improved[k]
        const d = improved[(k + 1) % improved.length]

        const distBefore =
          distanceFn(points[a], points[b]) +
          distanceFn(points[c], points[d])

        const distAfter =
          distanceFn(points[a], points[c]) +
          distanceFn(points[b], points[d])

        if (distAfter < distBefore - 0.0001) {
          // Reverse segment between i+1 and k
          const newOrder = [
            ...improved.slice(0, i + 1),
            ...improved.slice(i + 1, k + 1).reverse(),
            ...improved.slice(k + 1),
          ]
          improved = newOrder
          improved_count += 1
        }
      }
    }

    if (improved_count === 0) {
      break
    }
  }

  return improved
}

export const solveOptimizedTsp = (
  points: LatLng[],
  distanceFn: DistanceFn = haversineDistanceKm,
  maxIterations = 1000,
  maxStarts?: number,
): TspRoute | null => {
  if (points.length < 2) {
    return null
  }

  // Determine which start indices to try. If maxStarts is provided and smaller
  // than the number of points, sample start indices evenly to limit runtime.
  const n = points.length
  let startIndices: number[] = []
  if (!maxStarts || maxStarts >= n) {
    startIndices = Array.from({ length: n }, (_, i) => i)
  } else {
    const step = n / maxStarts
    for (let i = 0; i < maxStarts; i += 1) {
      startIndices.push(Math.floor(i * step))
    }
    // Ensure last index included
    if (startIndices[startIndices.length - 1] !== n - 1) {
      startIndices.push(n - 1)
    }
  }

  let bestRoute: TspRoute | null = null
  let bestStartIndex = 0

  for (const startIndex of startIndices) {
    const initialRoute = solveNearestNeighborTsp(points, startIndex, distanceFn)

    if (!initialRoute) continue

    const improvedOrder = improve2OptTsp(
      initialRoute.order,
      points,
      maxIterations,
      distanceFn,
    )
    const totalDistanceKm = calculateTourDistance(improvedOrder, points, distanceFn)
    const candidateRoute: TspRoute = {
      order: improvedOrder,
      closedOrder: [...improvedOrder, improvedOrder[0]],
      totalDistanceKm,
      bestStartIndex: startIndex,
    }

    if (!bestRoute || candidateRoute.totalDistanceKm < bestRoute.totalDistanceKm) {
      bestRoute = candidateRoute
      bestStartIndex = startIndex
    }
  }

  if (bestRoute) {
    bestRoute.bestStartIndex = bestStartIndex
  }

  return bestRoute
}


export const solveLKTsp = (
  points: LatLng[],
  options?: {
    maxIterations?: number
  },
  distanceFn: DistanceFn = haversineDistanceKm,
): TspRoute | null => {
  if (points.length < 2) return null

  const n = points.length
  const maxIterations = options?.maxIterations ?? Math.min(n * 150, 100000)

  // Start with nearest neighbor seed, then apply aggressive 2-opt and 3-opt
  const seed = solveNearestNeighborTsp(points, 0, distanceFn)
  let bestOrder = seed ? seed.order.slice() : Array.from({ length: n }, (_, i) => i)
  let bestDist = calculateTourDistance(bestOrder, points, distanceFn)

  let improved = true
  let iteration = 0

  // Main LK loop: iteratively apply 2-opt and 3-opt moves
  while (improved && iteration < maxIterations) {
    improved = false
    iteration += 1

    // Phase 1: Aggressive 2-opt passes
    for (let i = 0; i < n - 1; i += 1) {
      for (let j = i + 2; j < n; j += 1) {
        const a = bestOrder[i]
        const b = bestOrder[i + 1]
        const c = bestOrder[j]
        const d = bestOrder[(j + 1) % n]

        const distBefore = distanceFn(points[a], points[b]) + distanceFn(points[c], points[d])
        const distAfter = distanceFn(points[a], points[c]) + distanceFn(points[b], points[d])

        if (distAfter < distBefore - 0.0001) {
          // Perform 2-opt reversal
          bestOrder = [
            ...bestOrder.slice(0, i + 1),
            ...bestOrder.slice(i + 1, j + 1).reverse(),
            ...bestOrder.slice(j + 1),
          ]
          bestDist = calculateTourDistance(bestOrder, points, distanceFn)
          improved = true
        }
      }
    }

    // Phase 2: 3-opt moves (Or-opt: move a sequence of 1-3 cities to another position)
    if (!improved) {
      for (let i = 0; i < n && !improved; i += 1) {
        for (let seqLen = 1; seqLen <= 3 && i + seqLen < n && !improved; seqLen += 1) {
          for (let j = 0; j < n; j += 1) {
            if (j >= i && j <= i + seqLen) continue // Skip overlapping positions

            // Extract sequence from [i, i+seqLen) and insert after j
            const sequence = bestOrder.slice(i, i + seqLen)
            const newOrder = [
              ...bestOrder.slice(0, i),
              ...bestOrder.slice(i + seqLen, j < i ? j : j + 1),
              ...(j < i ? [] : []),
              ...sequence,
              ...(j >= i ? bestOrder.slice(j + 1) : bestOrder.slice(j)),
            ]

            // Ensure we have valid tour
            if (newOrder.length !== n) continue

            const newDist = calculateTourDistance(newOrder, points, distanceFn)
            if (newDist < bestDist - 0.0001) {
              bestOrder = newOrder
              bestDist = newDist
              improved = true
            }
          }
        }
      }
    }

    // Restart 2-opt if any improvement was made
    if (improved && iteration < maxIterations * 0.5) {
      // Do targeted 2-opt around recent changes
      const reapplyOrder = improve2OptTsp(bestOrder, points, 100, distanceFn)
      const reapplyDist = calculateTourDistance(reapplyOrder, points, distanceFn)
      if (reapplyDist < bestDist) {
        bestOrder = reapplyOrder
        bestDist = reapplyDist
      }
    }
  }

  return {
    order: bestOrder,
    closedOrder: [...bestOrder, bestOrder[0]],
    totalDistanceKm: bestDist,
  }
}
