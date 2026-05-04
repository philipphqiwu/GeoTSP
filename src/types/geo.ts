export type LatLng = {
  lat: number
  lng: number
}

export type IndexedPoint = LatLng & {
  id: number
}

export type TspRoute = {
  order: number[]
  closedOrder: number[]
  totalDistanceKm: number
}
