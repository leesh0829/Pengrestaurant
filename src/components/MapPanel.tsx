import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { loadNaverMapScript } from '../lib/naver'
import type { Restaurant } from '../types'

type MapPanelProps = {
  restaurants: Restaurant[]
  selectedRestaurantId: string | null
  focusRestaurantId: string | null
  focusNonce: number
  onSelectRestaurant: (restaurantId: string) => void
}

type NaverMapStatus = 'loading' | 'ready' | 'fallback'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function createMarkerHtml(restaurant: Restaurant, isSelected: boolean) {
  const iconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M7 4v8" />
      <path d="M10 4v8" />
      <path d="M7 8H5.5a1.5 1.5 0 0 1-1.5-1.5V4" />
      <path d="M15 4v16" />
      <path d="M15 4c3 0 5 2.6 5 5.8S18 15 15 15" />
    </svg>
  `

  return `
    <div class="map-marker ${isSelected ? 'is-selected' : ''}">
      <div class="map-marker-tooltip">
        <strong>${escapeHtml(restaurant.name)}</strong>
        <span>총 별점 ${restaurant.overallRating.toFixed(1)}</span>
      </div>
      <div class="map-marker-pin">
        <div class="map-marker-icon">${iconSvg}</div>
        <div class="map-marker-stem"></div>
      </div>
    </div>
  `
}

function hasValidCoordinates(restaurant: Restaurant) {
  return (
    Number.isFinite(restaurant.latitude) &&
    Number.isFinite(restaurant.longitude) &&
    (restaurant.latitude !== 0 || restaurant.longitude !== 0)
  )
}

function LeafletMap({
  restaurants,
  selectedRestaurantId,
  focusRestaurantId,
  focusNonce,
  onSelectRestaurant,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const onSelectRestaurantRef = useRef(onSelectRestaurant)
  const hasInitializedCameraRef = useRef(false)
  const previousSelectedRestaurantIdRef = useRef<string | null>(null)

  useEffect(() => {
    onSelectRestaurantRef.current = onSelectRestaurant
  }, [onSelectRestaurant])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const center = { latitude: 37.5665, longitude: 126.978 }
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([center.latitude, center.longitude], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const markerLayer = markerLayerRef.current
    if (!map || !markerLayer) {
      return
    }

    markerLayer.clearLayers()

    const visibleRestaurants = restaurants.filter(hasValidCoordinates)

    visibleRestaurants.forEach((restaurant) => {
      const marker = L.marker([restaurant.latitude, restaurant.longitude], {
        icon: L.divIcon({
          className: 'map-marker-shell',
          html: createMarkerHtml(restaurant, restaurant.id === selectedRestaurantId),
          iconSize: [176, 88],
          iconAnchor: [88, 80],
        }),
      })

      marker.on('click', () => onSelectRestaurantRef.current(restaurant.id))
      marker.addTo(markerLayer)
    })

    if (!hasInitializedCameraRef.current && visibleRestaurants.length > 0) {
      hasInitializedCameraRef.current = true
      const bounds = L.latLngBounds(
        visibleRestaurants.map((restaurant) => [restaurant.latitude, restaurant.longitude]),
      )
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 })
    }

    const previousSelectedRestaurantId = previousSelectedRestaurantIdRef.current
    previousSelectedRestaurantIdRef.current = selectedRestaurantId

    if (!selectedRestaurantId || previousSelectedRestaurantId === selectedRestaurantId) {
      return
    }

    const selectedRestaurant = visibleRestaurants.find(
      (restaurant) => restaurant.id === selectedRestaurantId,
    )
    if (selectedRestaurant) {
      map.flyTo([selectedRestaurant.latitude, selectedRestaurant.longitude], 15, {
        duration: 0.6,
      })
    }
  }, [restaurants, selectedRestaurantId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusRestaurantId) {
      return
    }

    const focusedRestaurant = restaurants.find((restaurant) => restaurant.id === focusRestaurantId)
    if (!focusedRestaurant || !hasValidCoordinates(focusedRestaurant)) {
      return
    }

    map.flyTo([focusedRestaurant.latitude, focusedRestaurant.longitude], 15, {
      duration: 0.6,
    })
  }, [focusNonce, focusRestaurantId, restaurants])

  return <div ref={containerRef} className="map-canvas" />
}

function NaverMap({
  restaurants,
  selectedRestaurantId,
  focusRestaurantId,
  focusNonce,
  onSelectRestaurant,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const onSelectRestaurantRef = useRef(onSelectRestaurant)
  const hasInitializedCameraRef = useRef(false)
  const previousSelectedRestaurantIdRef = useRef<string | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    onSelectRestaurantRef.current = onSelectRestaurant
  }, [onSelectRestaurant])

  useEffect(() => {
    const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID
    if (!containerRef.current || !clientId) {
      return
    }

    let mounted = true

    loadNaverMapScript(clientId)
      .then(() => {
        if (!mounted || !containerRef.current) {
          return
        }

        const naver = (window as unknown as Window & { naver: any }).naver
        mapRef.current = new naver.maps.Map(containerRef.current, {
          center: new naver.maps.LatLng(37.5665, 126.978),
          zoom: 14,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: false,
        })
        setIsMapReady(true)
      })
      .catch(() => {
        mapRef.current = null
      })

    return () => {
      mounted = false
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }
  }, [])

  useEffect(() => {
    const naver = (window as Window & { naver?: any }).naver
    const map = mapRef.current

    if (!naver || !map || !isMapReady) {
      return
    }

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    const visibleRestaurants = restaurants.filter(hasValidCoordinates)

    visibleRestaurants.forEach((restaurant) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(restaurant.latitude, restaurant.longitude),
        map,
        icon: {
          content: createMarkerHtml(restaurant, restaurant.id === selectedRestaurantId),
          size: new naver.maps.Size(176, 88),
          anchor: new naver.maps.Point(88, 80),
        },
      })

      naver.maps.Event.addListener(marker, 'click', () => onSelectRestaurantRef.current(restaurant.id))
      markersRef.current.push(marker)
    })

    if (!hasInitializedCameraRef.current && visibleRestaurants.length > 0) {
      hasInitializedCameraRef.current = true
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(visibleRestaurants[0].latitude, visibleRestaurants[0].longitude),
        new naver.maps.LatLng(visibleRestaurants[0].latitude, visibleRestaurants[0].longitude),
      )
      visibleRestaurants.forEach((restaurant) => {
        bounds.extend(new naver.maps.LatLng(restaurant.latitude, restaurant.longitude))
      })
      map.fitBounds(bounds)
    }

    const previousSelectedRestaurantId = previousSelectedRestaurantIdRef.current
    previousSelectedRestaurantIdRef.current = selectedRestaurantId

    if (!selectedRestaurantId || previousSelectedRestaurantId === selectedRestaurantId) {
      return
    }

    const selectedRestaurant = visibleRestaurants.find(
      (restaurant) => restaurant.id === selectedRestaurantId,
    )
    if (selectedRestaurant) {
      map.panTo(new naver.maps.LatLng(selectedRestaurant.latitude, selectedRestaurant.longitude))
      map.setZoom(15)
    }
  }, [restaurants, selectedRestaurantId, isMapReady])

  useEffect(() => {
    const naver = (window as Window & { naver?: any }).naver
    const map = mapRef.current

    if (!naver || !map || !focusRestaurantId) {
      return
    }

    const focusedRestaurant = restaurants.find((restaurant) => restaurant.id === focusRestaurantId)
    if (!focusedRestaurant || !hasValidCoordinates(focusedRestaurant)) {
      return
    }

    map.panTo(new naver.maps.LatLng(focusedRestaurant.latitude, focusedRestaurant.longitude))
    map.setZoom(15)
  }, [focusNonce, focusRestaurantId, restaurants])

  return <div ref={containerRef} className="map-canvas" />
}

export function MapPanel(props: MapPanelProps) {
  const [mapStatus, setMapStatus] = useState<NaverMapStatus>(
    import.meta.env.VITE_NAVER_MAP_CLIENT_ID ? 'loading' : 'fallback',
  )

  useEffect(() => {
    const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID
    if (!clientId) {
      setMapStatus('fallback')
      return
    }

    loadNaverMapScript(clientId)
      .then(() => setMapStatus('ready'))
      .catch(() => setMapStatus('fallback'))
  }, [])

  return (
    <section className="map-panel">
      {mapStatus === 'ready' ? <NaverMap {...props} /> : <LeafletMap {...props} />}
      <span className="map-badge floating">
        {mapStatus === 'ready' ? '네이버 지도' : 'OpenStreetMap 대체 지도'}
      </span>
    </section>
  )
}
