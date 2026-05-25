import { haversineDistanceKm } from './graph'
import type { LatLng, TspRoute } from '../types/geo'

type DistanceFn = (from: LatLng, to: LatLng) => number

const calculateTourDistance = (
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
