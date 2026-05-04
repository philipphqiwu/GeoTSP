import type { LatLng } from '../types/geo'

const EARTH_RADIUS_KM = 6371

const toRadians = (deg: number): number => (deg * Math.PI) / 180

export const haversineDistanceKm = (from: LatLng, to: LatLng): number => {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}
