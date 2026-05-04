import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import './App.css'
import { AdminPasswordModal } from './components/AdminPasswordModal'
import { GripIcon, MenuIcon, PanelCloseIcon, ShieldIcon, ShieldOffIcon } from './components/Icons'
import { MapPanel } from './components/MapPanel'
import { RestaurantFormModal } from './components/RestaurantFormModal'
import { Sidebar } from './components/Sidebar'
import { ADMIN_SESSION_KEY, ADMIN_TOKEN_KEY } from './data'
import {
  createRestaurant,
  deleteRestaurant,
  fetchRestaurants,
  loginAdmin,
  updateRestaurant,
} from './lib/api'
import type { Restaurant, RestaurantDraft, RestaurantFilters, SortOption } from './types'

const EMPTY_FILTERS: RestaurantFilters = {
  district1: '',
  district2: '',
  district3: '',
  overallRating: 'all',
  tasteRating: 'all',
  cleanlinessRating: 'all',
  designRating: 'all',
  serviceRating: 'all',
  valueRating: 'all',
}

function parseRatingFilter(value: RestaurantFilters[keyof RestaurantFilters]) {
  return value === 'all' ? null : Number(value)
}

function sortRestaurants(restaurants: Restaurant[], sortOption: SortOption) {
  const sorted = [...restaurants]

  sorted.sort((left, right) => {
    if (sortOption === 'name') {
      return left.name.localeCompare(right.name, 'ko')
    }

    return right[sortOption] - left[sortOption] || left.name.localeCompare(right.name, 'ko')
  })

  return sorted
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 960)

  useEffect(() => {
    const listener = () => setIsMobile(window.innerWidth < 960)
    window.addEventListener('resize', listener)
    return () => window.removeEventListener('resize', listener)
  }, [])

  return isMobile
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, 'ko'))
}

type KoreaNeighborhood = {
  code: string
  name: string
}

type KoreaDistrict = {
  code: string
  name: string
  neighborhoods: KoreaNeighborhood[]
}

type KoreaRegion = {
  code: string
  name: string
  districts: KoreaDistrict[]
}

function createFilterChangeHandler(setFilters: Dispatch<SetStateAction<RestaurantFilters>>) {
  return (key: keyof RestaurantFilters, value: string) => {
    setFilters((current) => {
      if (key === 'district1') {
        return { ...current, district1: value, district2: '', district3: '' }
      }

      if (key === 'district2') {
        return { ...current, district2: value, district3: '' }
      }

      return { ...current, [key]: value }
    })
  }
}

function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filters, setFilters] = useState<RestaurantFilters>(EMPTY_FILTERS)
  const [sortOption, setSortOption] = useState<SortOption>('name')
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY) || '')
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [adminErrorMessage, setAdminErrorMessage] = useState('')
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true)
  const [regionData, setRegionData] = useState<KoreaRegion[]>([])
  const [mapFocusRequest, setMapFocusRequest] = useState({ restaurantId: null as string | null, nonce: 0 })
  const isMobile = useIsMobile()
  const isAdmin = Boolean(adminToken)

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)
        setPageError('')
        const nextRestaurants = await fetchRestaurants()
        setRestaurants(nextRestaurants)
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : '식당 데이터를 불러오지 못했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [])

  useEffect(() => {
    const run = async () => {
      const module = await import('./data/koreaRegions.json')
      setRegionData(module.default as KoreaRegion[])
    }

    void run()
  }, [])

  useEffect(() => {
    if (adminToken) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken)
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
      return
    }

    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
  }, [adminToken])

  useEffect(() => {
    if (selectedRestaurantId) {
      setIsDesktopSidebarOpen(true)
      setIsMobileSheetOpen(true)
    }
  }, [selectedRestaurantId])

  useEffect(() => {
    if (!selectedRestaurantId) {
      return
    }

    const exists = restaurants.some((restaurant) => restaurant.id === selectedRestaurantId)
    if (!exists) {
      setSelectedRestaurantId(null)
    }
  }, [restaurants, selectedRestaurantId])

  const district1Options = uniqueSorted(regionData.map((region) => region.name))
  const selectedRegion = regionData.find((region) => region.name === filters.district1)
  const district2Options = selectedRegion
    ? uniqueSorted(selectedRegion.districts.map((district) => district.name))
    : uniqueSorted(
        regionData.flatMap((region) => region.districts.map((district) => district.name)),
      )

  const selectedDistrict = selectedRegion?.districts.find(
    (district) => district.name === filters.district2,
  )

  const district3Options = selectedDistrict
    ? uniqueSorted(selectedDistrict.neighborhoods.map((neighborhood) => neighborhood.name))
    : selectedRegion
      ? uniqueSorted(
          selectedRegion.districts.flatMap((district) =>
            district.neighborhoods.map((neighborhood) => neighborhood.name),
          ),
        )
      : uniqueSorted(
          regionData.flatMap((region) =>
            region.districts.flatMap((district) =>
              district.neighborhoods.map((neighborhood) => neighborhood.name),
            ),
          ),
        )

  const filteredRestaurants = sortRestaurants(
    restaurants.filter((restaurant) => {
      const overallMinimum = parseRatingFilter(filters.overallRating)
      const tasteMinimum = parseRatingFilter(filters.tasteRating)
      const cleanlinessMinimum = parseRatingFilter(filters.cleanlinessRating)
      const designMinimum = parseRatingFilter(filters.designRating)
      const serviceMinimum = parseRatingFilter(filters.serviceRating)
      const valueMinimum = parseRatingFilter(filters.valueRating)

      return (
        (!filters.district1 || restaurant.district1 === filters.district1) &&
        (!filters.district2 || restaurant.district2 === filters.district2) &&
        (!filters.district3 || restaurant.district3 === filters.district3) &&
        (!overallMinimum || restaurant.overallRating >= overallMinimum) &&
        (!tasteMinimum || restaurant.tasteRating >= tasteMinimum) &&
        (!cleanlinessMinimum || restaurant.cleanlinessRating >= cleanlinessMinimum) &&
        (!designMinimum || restaurant.designRating >= designMinimum) &&
        (!serviceMinimum || restaurant.serviceRating >= serviceMinimum) &&
        (!valueMinimum || restaurant.valueRating >= valueMinimum)
      )
    }),
    sortOption,
  )

  const selectedRestaurant =
    filteredRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    null

  const handleFilterChange = createFilterChangeHandler(setFilters)
  const desktopSidebarVisible = Boolean(selectedRestaurant || isDesktopSidebarOpen)

  const openCreateModal = () => {
    setMutationError('')
    setFormMode('create')
    setEditingRestaurant(null)
    setIsFormOpen(true)
  }

  const openEditModal = (restaurant: Restaurant) => {
    setMutationError('')
    setFormMode('edit')
    setEditingRestaurant(restaurant)
    setIsFormOpen(true)
  }

  const handleMutationAuthFailure = (error: unknown) => {
    const message = error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.'
    if (message.includes('인증')) {
      setAdminToken('')
      setAdminErrorMessage('어드민 세션이 만료되었습니다. 다시 로그인해 주세요.')
      setIsAdminModalOpen(true)
    }
    setMutationError(message)
  }

  return (
    <div className="app-shell">
      {!isMobile ? (
        <>
          <button
            type="button"
            className={`floating-toggle icon-button ${desktopSidebarVisible ? 'is-open' : ''}`}
            onClick={() => {
              if (selectedRestaurant) {
                return
              }

              setIsDesktopSidebarOpen((current) => !current)
            }}
            aria-label={desktopSidebarVisible ? '사이드바 접기' : '사이드바 열기'}
            title={desktopSidebarVisible ? '사이드바 접기' : '사이드바 열기'}
          >
            {desktopSidebarVisible ? <PanelCloseIcon /> : <MenuIcon />}
          </button>

          <aside className={`sidebar-dock ${desktopSidebarVisible ? 'is-open' : ''}`}>
            <Sidebar
              restaurants={filteredRestaurants}
              selectedRestaurant={selectedRestaurant}
              filters={filters}
              sortOption={sortOption}
              district1Options={district1Options}
              district2Options={district2Options}
              district3Options={district3Options}
              isAdmin={isAdmin}
              isMobile={false}
              onSelectRestaurant={(restaurantId) => setSelectedRestaurantId(restaurantId)}
              onBackToList={() => setSelectedRestaurantId(null)}
              onFilterChange={handleFilterChange}
              onSortChange={setSortOption}
              onOpenCreateModal={openCreateModal}
              onOpenEditModal={openEditModal}
              onDeleteRestaurant={(restaurant) => {
                const shouldDelete = window.confirm(`${restaurant.name} 리뷰를 삭제할까요?`)
                if (!shouldDelete) {
                  return
                }

                const run = async () => {
                  try {
                    setIsMutating(true)
                    setMutationError('')
                    await deleteRestaurant(adminToken, restaurant.id)
                    setRestaurants((current) =>
                      current.filter((currentRestaurant) => currentRestaurant.id !== restaurant.id),
                    )
                    setSelectedRestaurantId(null)
                  } catch (error) {
                    handleMutationAuthFailure(error)
                  } finally {
                    setIsMutating(false)
                  }
                }

                void run()
              }}
            />
          </aside>
        </>
      ) : null}

      <button
        type="button"
        className={`admin-float icon-button ${isAdmin ? 'is-active' : ''}`}
        onClick={() => {
          if (isAdmin) {
            setAdminToken('')
            return
          }

          setIsAdminModalOpen(true)
          setAdminErrorMessage('')
        }}
        aria-label={isAdmin ? '어드민 종료' : '어드민 모드'}
        title={isAdmin ? '어드민 종료' : '어드민 모드'}
      >
        {isAdmin ? <ShieldOffIcon /> : <ShieldIcon />}
      </button>

      {pageError ? <div className="status-banner overlay error">{pageError}</div> : null}
      {mutationError ? <div className="status-banner overlay error second">{mutationError}</div> : null}
      {isLoading ? <div className="status-banner overlay">식당 데이터를 불러오는 중입니다...</div> : null}
      {isMutating ? <div className="status-banner overlay second">변경 사항을 저장하는 중입니다...</div> : null}

      <MapPanel
        restaurants={filteredRestaurants}
        selectedRestaurantId={selectedRestaurantId}
        focusRestaurantId={mapFocusRequest.restaurantId}
        focusNonce={mapFocusRequest.nonce}
        onSelectRestaurant={(restaurantId) => setSelectedRestaurantId(restaurantId)}
      />

      {isMobile ? (
        <div className={`mobile-sheet ${isMobileSheetOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="mobile-sheet-handle icon-button"
            onClick={() => setIsMobileSheetOpen((current) => !current)}
            aria-label={selectedRestaurant ? '상세 패널 토글' : '리스트 패널 토글'}
            title={selectedRestaurant ? '상세 패널 토글' : '리스트 패널 토글'}
          >
            <GripIcon />
          </button>

          <Sidebar
            restaurants={filteredRestaurants}
            selectedRestaurant={selectedRestaurant}
            filters={filters}
            sortOption={sortOption}
            district1Options={district1Options}
            district2Options={district2Options}
            district3Options={district3Options}
            isAdmin={isAdmin}
            isMobile
            onSelectRestaurant={(restaurantId) => {
              setSelectedRestaurantId(restaurantId)
              setIsMobileSheetOpen(true)
            }}
            onBackToList={() => setSelectedRestaurantId(null)}
            onFilterChange={handleFilterChange}
            onSortChange={setSortOption}
            onOpenCreateModal={openCreateModal}
            onOpenEditModal={openEditModal}
            onDeleteRestaurant={(restaurant) => {
              const shouldDelete = window.confirm(`${restaurant.name} 리뷰를 삭제할까요?`)
              if (!shouldDelete) {
                return
              }

              const run = async () => {
                try {
                  setIsMutating(true)
                  setMutationError('')
                  await deleteRestaurant(adminToken, restaurant.id)
                  setRestaurants((current) =>
                    current.filter((currentRestaurant) => currentRestaurant.id !== restaurant.id),
                  )
                  setSelectedRestaurantId(null)
                } catch (error) {
                  handleMutationAuthFailure(error)
                } finally {
                  setIsMutating(false)
                }
              }

              void run()
            }}
          />
        </div>
      ) : null}

      <AdminPasswordModal
        isOpen={isAdminModalOpen}
        errorMessage={adminErrorMessage}
        onClose={() => setIsAdminModalOpen(false)}
        onSubmit={(password) => {
          const run = async () => {
            try {
              setAdminErrorMessage('')
              const { token } = await loginAdmin(password)
              setAdminToken(token)
              setIsAdminModalOpen(false)
            } catch (error) {
              setAdminErrorMessage(
                error instanceof Error ? error.message : '비밀번호 확인 중 오류가 발생했습니다.',
              )
            }
          }

          void run()
        }}
      />

      <RestaurantFormModal
        isOpen={isFormOpen}
        mode={formMode}
        initialValue={editingRestaurant}
        regionData={regionData}
        onClose={() => setIsFormOpen(false)}
        onSubmit={(draft: RestaurantDraft) => {
          const run = async () => {
            try {
              setIsMutating(true)
              setMutationError('')

              if (formMode === 'edit' && editingRestaurant) {
                const nextRestaurant = await updateRestaurant(
                  adminToken,
                  editingRestaurant.id,
                  draft,
                )
                setRestaurants((current) =>
                  current.map((restaurant) =>
                    restaurant.id === editingRestaurant.id ? nextRestaurant : restaurant,
                  ),
                )
                setSelectedRestaurantId(nextRestaurant.id)
              } else {
                const nextRestaurant = await createRestaurant(adminToken, draft)
                setRestaurants((current) => [...current, nextRestaurant])
                setSelectedRestaurantId(null)
                setMapFocusRequest({
                  restaurantId: nextRestaurant.id,
                  nonce: Date.now(),
                })
              }

              setIsFormOpen(false)
            } catch (error) {
              handleMutationAuthFailure(error)
            } finally {
              setIsMutating(false)
            }
          }

          void run()
        }}
      />
    </div>
  )
}

export default App
