import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

dotenv.config({ path: '.env.local', override: false })
dotenv.config()

const port = Number(process.env.PORT || 8787)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = express()
app.set('trust proxy', 1)
const adminTokens = new Set()

app.use(
  cors((request, callback) => {
    const origin = request.header('Origin')
    const host = request.header('x-forwarded-host') || request.header('host')
    const forwardedProtocol = request.header('x-forwarded-proto') || request.protocol || 'http'
    const protocol = forwardedProtocol.split(',')[0].trim()
    const sameOrigin = origin && host && origin === `${protocol}://${host}`

    if (!origin || sameOrigin || allowedOrigins.includes(origin)) {
      callback(null, { origin: true })
      return
    }

    callback(new Error(`CORS 거부: ${origin}`))
  }),
)
app.use(express.json())
app.use('/api', async (_request, _response, next) => {
  try {
    getAdminPassword()
    await ensureDatabaseInitialized()
    next()
  } catch (error) {
    next(error)
  }
})

const loginAttempts = new Map()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 8

function rateLimitLogin(request, response, next) {
  const ip = request.ip || request.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (record && now - record.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip)
  }

  const current = loginAttempts.get(ip)
  if (current && current.count >= LOGIN_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil(
      (LOGIN_WINDOW_MS - (now - current.firstAttemptAt)) / 1000,
    )
    response.setHeader('Retry-After', String(retryAfterSeconds))
    response.status(429).json({
      error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    })
    return
  }

  next()
}

function recordLoginFailure(request) {
  const ip = request.ip || request.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const record = loginAttempts.get(ip) || { firstAttemptAt: now, count: 0 }
  record.count += 1
  loginAttempts.set(ip, record)
}

function clearLoginAttempts(request) {
  const ip = request.ip || request.socket.remoteAddress || 'unknown'
  loginAttempts.delete(ip)
}

function getAdminPassword() {
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD가 설정되지 않았습니다. 환경 변수에 강한 비밀번호를 지정해 주세요.')
  }

  return adminPassword
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL이 설정되지 않았습니다. 환경 변수에 PostgreSQL 연결 문자열을 넣어 주세요.',
    )
  }

  return databaseUrl
}

let pool
let databaseInitializationPromise = null

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    })

    pool.on('error', (error) => {
      console.error('PostgreSQL idle client error:', error)
    })
  }

  return pool
}

async function ensureDatabaseInitialized() {
  if (!databaseInitializationPromise) {
    databaseInitializationPromise = initializeDatabase().catch((error) => {
      databaseInitializationPromise = null
      throw error
    })
  }

  await databaseInitializationPromise
}

async function withTransaction(task) {
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')
    const result = await task(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function initializeDatabase() {
  await withTransaction(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        district1 TEXT NOT NULL,
        district2 TEXT NOT NULL,
        district3 TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        overall_rating DOUBLE PRECISION NOT NULL,
        taste_rating DOUBLE PRECISION NOT NULL,
        cleanliness_rating DOUBLE PRECISION NOT NULL,
        design_rating DOUBLE PRECISION NOT NULL,
        service_rating DOUBLE PRECISION NOT NULL,
        value_rating DOUBLE PRECISION NOT NULL DEFAULT 0,
        summary TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      ALTER TABLE restaurants
        ADD COLUMN IF NOT EXISTS value_rating DOUBLE PRECISION NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS restaurant_menus (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price TEXT NOT NULL
      );
    `)
  })
}

function normalizeDraft(draft) {
  return {
    name: String(draft.name || '').trim(),
    address: String(draft.address || '').trim(),
    district1: String(draft.district1 || '').trim(),
    district2: String(draft.district2 || '').trim(),
    district3: String(draft.district3 || '').trim(),
    latitude: Number(draft.latitude),
    longitude: Number(draft.longitude),
    overallRating: Number(draft.overallRating),
    tasteRating: Number(draft.tasteRating),
    cleanlinessRating: Number(draft.cleanlinessRating),
    designRating: Number(draft.designRating),
    serviceRating: Number(draft.serviceRating),
    valueRating: Number(draft.valueRating),
    summary: String(draft.summary || '').trim(),
    menus: Array.isArray(draft.menus)
      ? draft.menus
          .map((menu) => ({
            id: String(menu.id || crypto.randomUUID()),
            name: String(menu.name || '').trim(),
            price: String(menu.price || '').trim(),
          }))
          .filter((menu) => menu.name && menu.price)
      : [],
  }
}

function validateDraft(draft) {
  const requiredTextFields = [
    draft.name,
    draft.address,
    draft.district1,
    draft.district2,
    draft.district3,
    draft.summary,
  ]

  if (requiredTextFields.some((value) => !value)) {
    return '필수 텍스트 필드가 비어 있습니다.'
  }

  const ratings = [
    draft.overallRating,
    draft.tasteRating,
    draft.cleanlinessRating,
    draft.designRating,
    draft.serviceRating,
    draft.valueRating,
  ]

  if (ratings.some((rating) => Number.isNaN(rating) || rating < 0 || rating > 5)) {
    return '별점은 0점에서 5점 사이여야 합니다.'
  }

  if (Number.isNaN(draft.latitude) || Number.isNaN(draft.longitude)) {
    return '위도와 경도 값이 올바르지 않습니다.'
  }

  if (draft.menus.length === 0) {
    return '메뉴는 최소 1개 이상 필요합니다.'
  }

  return null
}

async function getRestaurantRows(client = getPool()) {
  const restaurantResult = await client.query(`
    SELECT
      id,
      name,
      address,
      district1,
      district2,
      district3,
      latitude,
      longitude,
      overall_rating AS "overallRating",
      taste_rating AS "tasteRating",
      cleanliness_rating AS "cleanlinessRating",
      design_rating AS "designRating",
      service_rating AS "serviceRating",
      value_rating AS "valueRating",
      summary,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM restaurants
    ORDER BY name ASC
  `)

  return restaurantResult.rows
}

async function getMenuRows(client = getPool(), restaurantId) {
  const params = []
  let whereClause = ''

  if (restaurantId) {
    params.push(restaurantId)
    whereClause = 'WHERE restaurant_id = $1'
  }

  const menuResult = await client.query(
    `
      SELECT
        id,
        restaurant_id AS "restaurantId",
        name,
        price
      FROM restaurant_menus
      ${whereClause}
      ORDER BY id ASC
    `,
    params,
  )

  return menuResult.rows
}

function mergeRestaurantsWithMenus(restaurantRows, menuRows) {
  const menuMap = new Map()

  for (const menu of menuRows) {
    if (!menuMap.has(menu.restaurantId)) {
      menuMap.set(menu.restaurantId, [])
    }

    menuMap.get(menu.restaurantId).push({
      id: menu.id,
      name: menu.name,
      price: menu.price,
    })
  }

  return restaurantRows.map((restaurant) => ({
    ...restaurant,
    menus: menuMap.get(restaurant.id) || [],
  }))
}

async function getRestaurants() {
  const [restaurantRows, menuRows] = await Promise.all([getRestaurantRows(), getMenuRows()])
  return mergeRestaurantsWithMenus(restaurantRows, menuRows)
}

async function getRestaurantById(restaurantId, client = getPool()) {
  const restaurantResult = await client.query(
    `
      SELECT
        id,
        name,
        address,
        district1,
        district2,
        district3,
        latitude,
        longitude,
        overall_rating AS "overallRating",
        taste_rating AS "tasteRating",
        cleanliness_rating AS "cleanlinessRating",
        design_rating AS "designRating",
        service_rating AS "serviceRating",
        value_rating AS "valueRating",
        summary,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM restaurants
      WHERE id = $1
    `,
    [restaurantId],
  )

  const restaurant = restaurantResult.rows[0]
  if (!restaurant) {
    return null
  }

  const menuRows = await getMenuRows(client, restaurantId)
  return mergeRestaurantsWithMenus([restaurant], menuRows)[0] || null
}

function requireAdminToken(request, response, next) {
  const authorization = request.get('Authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

  if (!token || !adminTokens.has(token)) {
    response.status(401).json({ error: '어드민 인증이 필요합니다.' })
    return
  }

  next()
}

async function upsertRestaurant(restaurantId, draft, existingRestaurant) {
  const timestamp = new Date().toISOString()
  const restaurant = {
    id: restaurantId || crypto.randomUUID(),
    createdAt: existingRestaurant?.createdAt || timestamp,
    updatedAt: timestamp,
    ...draft,
  }

  return withTransaction(async (client) => {
    if (existingRestaurant) {
      await client.query(
        `
          UPDATE restaurants
          SET
            name = $2,
            address = $3,
            district1 = $4,
            district2 = $5,
            district3 = $6,
            latitude = $7,
            longitude = $8,
            overall_rating = $9,
            taste_rating = $10,
            cleanliness_rating = $11,
            design_rating = $12,
            service_rating = $13,
            value_rating = $14,
            summary = $15,
            updated_at = $16
          WHERE id = $1
        `,
        [
          restaurant.id,
          restaurant.name,
          restaurant.address,
          restaurant.district1,
          restaurant.district2,
          restaurant.district3,
          restaurant.latitude,
          restaurant.longitude,
          restaurant.overallRating,
          restaurant.tasteRating,
          restaurant.cleanlinessRating,
          restaurant.designRating,
          restaurant.serviceRating,
          restaurant.valueRating,
          restaurant.summary,
          restaurant.updatedAt,
        ],
      )

      await client.query('DELETE FROM restaurant_menus WHERE restaurant_id = $1', [restaurant.id])
    } else {
      await client.query(
        `
          INSERT INTO restaurants (
            id, name, address, district1, district2, district3, latitude, longitude,
            overall_rating, taste_rating, cleanliness_rating, design_rating,
            service_rating, value_rating, summary, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
        `,
        [
          restaurant.id,
          restaurant.name,
          restaurant.address,
          restaurant.district1,
          restaurant.district2,
          restaurant.district3,
          restaurant.latitude,
          restaurant.longitude,
          restaurant.overallRating,
          restaurant.tasteRating,
          restaurant.cleanlinessRating,
          restaurant.designRating,
          restaurant.serviceRating,
          restaurant.valueRating,
          restaurant.summary,
          restaurant.createdAt,
          restaurant.updatedAt,
        ],
      )
    }

    for (const menu of draft.menus) {
      await client.query(
        `
          INSERT INTO restaurant_menus (id, restaurant_id, name, price)
          VALUES ($1, $2, $3, $4)
        `,
        [menu.id, restaurant.id, menu.name, menu.price],
      )
    }

    return getRestaurantById(restaurant.id, client)
  })
}

app.get('/api/health', async (_request, response) => {
  await getPool().query('SELECT 1')
  response.json({ ok: true })
})

app.get('/api/restaurants', async (_request, response) => {
  const restaurants = await getRestaurants()
  response.json(restaurants)
})

app.post('/api/admin/login', rateLimitLogin, (request, response) => {
  const adminPassword = getAdminPassword()
  const password = String(request.body?.password || '')

  if (password !== adminPassword) {
    recordLoginFailure(request)
    response.status(401).json({ error: '비밀번호가 올바르지 않습니다.' })
    return
  }

  clearLoginAttempts(request)
  const token = crypto.randomUUID()
  adminTokens.add(token)
  response.json({ token })
})

app.post('/api/restaurants', requireAdminToken, async (request, response) => {
  const draft = normalizeDraft(request.body)
  const validationError = validateDraft(draft)

  if (validationError) {
    response.status(400).json({ error: validationError })
    return
  }

  const restaurant = await upsertRestaurant(null, draft, null)
  response.status(201).json(restaurant)
})

app.put('/api/restaurants/:restaurantId', requireAdminToken, async (request, response) => {
  const existingRestaurant = await getRestaurantById(request.params.restaurantId)

  if (!existingRestaurant) {
    response.status(404).json({ error: '식당을 찾을 수 없습니다.' })
    return
  }

  const draft = normalizeDraft(request.body)
  const validationError = validateDraft(draft)

  if (validationError) {
    response.status(400).json({ error: validationError })
    return
  }

  const restaurant = await upsertRestaurant(request.params.restaurantId, draft, existingRestaurant)
  response.json(restaurant)
})

app.delete('/api/restaurants/:restaurantId', requireAdminToken, async (request, response) => {
  const deleteResult = await getPool().query('DELETE FROM restaurants WHERE id = $1', [
    request.params.restaurantId,
  ])

  if (deleteResult.rowCount === 0) {
    response.status(404).json({ error: '식당을 찾을 수 없습니다.' })
    return
  }

  response.json({ success: true })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: '서버 처리 중 오류가 발생했습니다.' })
})

async function startServer() {
  getAdminPassword()
  await ensureDatabaseInitialized()

  app.listen(port, () => {
    console.log(`Pengrestaurant API listening on http://localhost:${port}`)
    console.log(`PostgreSQL: ${getDatabaseUrl()}`)
  })
}

export async function handleRequest(request, response) {
  await ensureDatabaseInitialized()
  app(request, response)
}

export default handleRequest

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer().catch((error) => {
    console.error('PostgreSQL 초기화에 실패했습니다.')
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
