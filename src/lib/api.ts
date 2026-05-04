import type { Restaurant, RestaurantDraft } from '../types'

type LoginResponse = {
  token: string
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new Error(payload?.error || '요청 처리 중 오류가 발생했습니다.')
  }

  return payload as T
}

export async function fetchRestaurants() {
  try {
    const response = await fetch('/api/restaurants')
    const payload = await readJsonResponse<Restaurant[] | null>(response)

    if (!Array.isArray(payload)) {
      throw new Error('API 응답 형식이 올바르지 않습니다. 배포된 API 라우팅을 확인해 주세요.')
    }

    return payload
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('API 서버에 연결할 수 없습니다. `npm run dev`로 서버를 함께 실행해 주세요.')
    }
    throw error
  }
}

export async function loginAdmin(password: string) {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })

    const payload = await readJsonResponse<LoginResponse | null>(response)

    if (!payload || typeof payload.token !== 'string' || !payload.token) {
      throw new Error('로그인 응답 형식이 올바르지 않습니다. 배포된 API 라우팅을 확인해 주세요.')
    }

    return payload
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('API 서버에 연결할 수 없습니다. `npm run dev`로 서버를 함께 실행해 주세요.')
    }
    throw error
  }
}

function buildAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function createRestaurant(token: string, draft: RestaurantDraft) {
  try {
    const response = await fetch('/api/restaurants', {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify(draft),
    })

    return readJsonResponse<Restaurant>(response)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('API 서버에 연결할 수 없습니다. `npm run dev`로 서버를 함께 실행해 주세요.')
    }
    throw error
  }
}

export async function updateRestaurant(token: string, restaurantId: string, draft: RestaurantDraft) {
  try {
    const response = await fetch(`/api/restaurants/${restaurantId}`, {
      method: 'PUT',
      headers: buildAuthHeaders(token),
      body: JSON.stringify(draft),
    })

    return readJsonResponse<Restaurant>(response)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('API 서버에 연결할 수 없습니다. `npm run dev`로 서버를 함께 실행해 주세요.')
    }
    throw error
  }
}

export async function deleteRestaurant(token: string, restaurantId: string) {
  try {
    const response = await fetch(`/api/restaurants/${restaurantId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return readJsonResponse<{ success: boolean }>(response)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('API 서버에 연결할 수 없습니다. `npm run dev`로 서버를 함께 실행해 주세요.')
    }
    throw error
  }
}
