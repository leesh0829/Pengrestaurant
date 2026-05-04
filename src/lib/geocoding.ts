export type GeocodingResult = {
  latitude: number
  longitude: number
  district1: string
  district2: string
  district3: string
}

type NominatimEntry = {
  lat: string
  lon: string
  address?: Record<string, string>
}

type NaverAddressElement = {
  types?: string[]
  longName?: string
  shortName?: string
}

type NaverAddress = {
  x: string
  y: string
  roadAddress?: string
  jibunAddress?: string
  addressElements?: NaverAddressElement[]
}

function pickAddressValue(
  address: Record<string, string>,
  keys: string[],
  fallback = '',
) {
  for (const key of keys) {
    const value = address[key]
    if (value) {
      return value
    }
  }

  return fallback
}

function extractAdministrativeLevels(address: Record<string, string>) {
  const district1 = pickAddressValue(address, ['state', 'region', 'province'], '주소 확인 필요')
  const district2 = pickAddressValue(
    address,
    ['city', 'county', 'municipality', 'city_district', 'state_district'],
    '주소 확인 필요',
  )
  const district3 = pickAddressValue(
    address,
    ['borough', 'suburb', 'town', 'village', 'quarter', 'neighbourhood'],
    '주소 확인 필요',
  )

  return { district1, district2, district3 }
}

function findNaverElement(elements: NaverAddressElement[], type: string) {
  return elements.find((element) => element.types?.includes(type))?.longName ?? ''
}

function tryNaverGeocode(query: string): Promise<GeocodingResult | null> {
  const naver = (window as Window & { naver?: any }).naver
  if (!naver?.maps?.Service?.geocode) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    naver.maps.Service.geocode(
      { query },
      (status: number, response: { v2?: { addresses?: NaverAddress[] } }) => {
        if (status !== naver.maps.Service.Status.OK) {
          resolve(null)
          return
        }

        const item = response?.v2?.addresses?.[0]
        if (!item) {
          resolve(null)
          return
        }

        const elements = item.addressElements ?? []

        resolve({
          latitude: Number(item.y),
          longitude: Number(item.x),
          district1: findNaverElement(elements, 'SIDO') || '주소 확인 필요',
          district2: findNaverElement(elements, 'SIGUGUN') || '주소 확인 필요',
          district3: findNaverElement(elements, 'DONGMYUN') || '주소 확인 필요',
        })
      },
    )
  })
}

function trimAfterBuildingNumber(query: string): string | null {
  const tokens = query.trim().split(/\s+/)
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    if (/^\d+(?:-\d+)?$/.test(tokens[index])) {
      if (index === tokens.length - 1) {
        return null
      }
      return tokens.slice(0, index + 1).join(' ')
    }
  }
  return null
}

async function geocodeWithNaver(query: string): Promise<GeocodingResult | null> {
  const direct = await tryNaverGeocode(query)
  if (direct) {
    return direct
  }

  const trimmed = trimAfterBuildingNumber(query)
  if (trimmed) {
    const retry = await tryNaverGeocode(trimmed)
    if (retry) {
      return retry
    }
  }

  return null
}

async function tryNominatim(query: string): Promise<GeocodingResult | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ko&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    return null
  }

  const results = (await response.json()) as NominatimEntry[]
  const firstResult = results[0]
  if (!firstResult) {
    return null
  }

  const levels = extractAdministrativeLevels(firstResult.address ?? {})
  return {
    latitude: Number(firstResult.lat),
    longitude: Number(firstResult.lon),
    ...levels,
  }
}

async function geocodeWithNominatim(query: string): Promise<GeocodingResult> {
  const direct = await tryNominatim(query)
  if (direct) {
    return direct
  }

  const trimmed = trimAfterBuildingNumber(query)
  if (trimmed) {
    const retry = await tryNominatim(trimmed)
    if (retry) {
      return retry
    }
  }

  throw new Error('검색된 주소가 없습니다. 주소를 조금 더 구체적으로 입력해 주세요.')
}

export async function geocodeAddress(query: string): Promise<GeocodingResult> {
  const naverResult = await geocodeWithNaver(query)
  if (naverResult) {
    return naverResult
  }

  return geocodeWithNominatim(query)
}
