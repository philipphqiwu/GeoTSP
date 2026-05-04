import { haversineDistanceKm } from './graph'
import type { LatLng, TspRoute } from '../types/geo'

export const solveNearestNeighborTsp = (
  points: LatLng[],
  startIndex = 0,
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

      const distance = haversineDistanceKm(points[current], points[i])
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
  let totalDistanceKm = 0

  for (let i = 0; i < closedOrder.length - 1; i += 1) {
    const from = points[closedOrder[i]]
    const to = points[closedOrder[i + 1]]
    totalDistanceKm += haversineDistanceKm(from, to)
  }

  return {
    order,
    closedOrder,
    totalDistanceKm,
  }
}
