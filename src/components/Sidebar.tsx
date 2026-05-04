import { useState } from 'react'
import type { RatingFilterValue, Restaurant, RestaurantFilters, SortOption } from '../types'
import {
  BackIcon,
  CloseIcon,
  EditIcon,
  FilterIcon,
  PlusIcon,
  TrashIcon,
} from './Icons'
import { StarRating } from './StarRating'

const ratingOptions: { label: string; value: RatingFilterValue }[] = [
  { label: '전체', value: 'all' },
  ...Array.from({ length: 11 }, (_, index) => {
    const value = (index * 0.5).toFixed(1)
    return {
      label: `${value}점 이상`,
      value,
    }
  }),
]

const sortOptions: { label: string; value: SortOption }[] = [
  { label: '이름순', value: 'name' },
  { label: '총 별점 높은순', value: 'overallRating' },
  { label: '맛 점수 높은순', value: 'tasteRating' },
  { label: '청결 점수 높은순', value: 'cleanlinessRating' },
  { label: '분위기 점수 높은순', value: 'designRating' },
  { label: '서비스 점수 높은순', value: 'serviceRating' },
  { label: '가성비 점수 높은순', value: 'valueRating' },
]

type SidebarProps = {
  restaurants: Restaurant[]
  selectedRestaurant: Restaurant | null
  filters: RestaurantFilters
  sortOption: SortOption
  district1Options: string[]
  district2Options: string[]
  district3Options: string[]
  isAdmin: boolean
  isMobile: boolean
  onSelectRestaurant: (restaurantId: string) => void
  onBackToList: () => void
  onFilterChange: (key: keyof RestaurantFilters, value: string) => void
  onSortChange: (value: SortOption) => void
  onOpenCreateModal: () => void
  onOpenEditModal: (restaurant: Restaurant) => void
  onDeleteRestaurant: (restaurant: Restaurant) => void
}

function RatingLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="detail-rating-row">
      <span>{label}</span>
      <StarRating value={value} size="sm" />
    </div>
  )
}

function countActiveFilters(filters: RestaurantFilters) {
  let count = 0
  if (filters.district1) count += 1
  if (filters.district2) count += 1
  if (filters.district3) count += 1
  for (const key of [
    'overallRating',
    'tasteRating',
    'cleanlinessRating',
    'designRating',
    'serviceRating',
    'valueRating',
  ] as const) {
    if (filters[key] !== 'all') count += 1
  }
  return count
}

export function Sidebar({
  restaurants,
  selectedRestaurant,
  filters,
  sortOption,
  district1Options,
  district2Options,
  district3Options,
  isAdmin,
  isMobile,
  onSelectRestaurant,
  onBackToList,
  onFilterChange,
  onSortChange,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteRestaurant,
}: SidebarProps) {
  const detailMode = Boolean(selectedRestaurant)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const activeFilterCount = countActiveFilters(filters)

  const filterPanel = isFilterPanelOpen ? (
    <div
      className={`filter-sheet ${isMobile ? 'mobile' : ''}`}
      role="dialog"
      aria-modal={isMobile ? 'true' : undefined}
      aria-label="필터 및 정렬"
    >
      {isMobile ? (
        <button
          type="button"
          className="filter-sheet-backdrop"
          aria-label="필터 닫기"
          onClick={() => setIsFilterPanelOpen(false)}
        />
      ) : null}

      <div className="filter-sheet-card">
        <div className="filter-sheet-head">
          <div>
            <p className="sidebar-kicker">필터 · 정렬</p>
            <h3>한 곳에서 조정</h3>
          </div>
          <button
            type="button"
            className="ghost-button icon-button"
            onClick={() => setIsFilterPanelOpen(false)}
            aria-label="필터 닫기"
            title="필터 닫기"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="filter-sheet-body">
          <div className="sidebar-section">
            <div className="sidebar-section-head">
              <div>
                <p className="sidebar-kicker">지역 필터</p>
                <h3>대한민국 전체 행정구역</h3>
              </div>
            </div>

            <div className="filter-stack">
              <label className="field compact-field">
                <span>시/도</span>
                <select
                  value={filters.district1}
                  onChange={(event) => onFilterChange('district1', event.target.value)}
                >
                  <option value="">전체 시/도</option>
                  {district1Options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field compact-field">
                <span>시/군/구</span>
                <select
                  value={filters.district2}
                  onChange={(event) => onFilterChange('district2', event.target.value)}
                >
                  <option value="">전체 시/군/구</option>
                  {district2Options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field compact-field">
                <span>읍/면/동</span>
                <select
                  value={filters.district3}
                  onChange={(event) => onFilterChange('district3', event.target.value)}
                >
                  <option value="">전체 읍/면/동</option>
                  {district3Options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-head">
              <div>
                <p className="sidebar-kicker">평점 필터</p>
                <h3>내 기준 점수선</h3>
              </div>
            </div>

            <div className="filter-grid">
              {[
                ['총 별점', 'overallRating'],
                ['맛', 'tasteRating'],
                ['위생/청결', 'cleanlinessRating'],
                ['식당 디자인', 'designRating'],
                ['서비스', 'serviceRating'],
                ['가성비', 'valueRating'],
              ].map(([label, key]) => (
                <label className="field compact-field" key={key}>
                  <span>{label}</span>
                  <select
                    value={filters[key as keyof RestaurantFilters]}
                    onChange={(event) =>
                      onFilterChange(key as keyof RestaurantFilters, event.target.value)
                    }
                  >
                    {ratingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-head">
              <div>
                <p className="sidebar-kicker">정렬</p>
                <h3>보는 순서</h3>
              </div>
            </div>

            <label className="field compact-field">
              <span>리스트 정렬</span>
              <select
                value={sortOption}
                onChange={(event) => onSortChange(event.target.value as SortOption)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <aside className={`sidebar ${detailMode ? 'sidebar-detail' : ''} ${isMobile ? 'mobile' : ''}`}>
        {!detailMode ? (
          <>
            <div className="sidebar-intro">
              <div>
                <p className="eyebrow">Private restaurant archive</p>
                <h1>Pengrestaurant</h1>
                <p className="sidebar-copy">지도 위에 내가 먹은 식당만 조용히 정리하는 개인 기록.</p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  className="primary-button icon-button"
                  onClick={onOpenCreateModal}
                  aria-label="리뷰 추가"
                  title="리뷰 추가"
                >
                  <PlusIcon />
                </button>
              ) : null}
            </div>

            <div className="sidebar-section">
              <div className="sidebar-section-head">
                <div>
                  <p className="sidebar-kicker">리뷰 목록</p>
                  <h3>등록된 식당</h3>
                </div>
                <div className="list-head-actions">
                  <button
                    type="button"
                    className={`secondary-button icon-button ${activeFilterCount > 0 ? 'is-active' : ''}`}
                    onClick={() => setIsFilterPanelOpen((current) => !current)}
                    aria-label={`필터 및 정렬${activeFilterCount > 0 ? ` (${activeFilterCount}개 적용)` : ''}`}
                    title="필터 및 정렬"
                    aria-expanded={isFilterPanelOpen}
                  >
                    <FilterIcon />
                    {activeFilterCount > 0 ? (
                      <span className="filter-badge">{activeFilterCount}</span>
                    ) : null}
                  </button>
                  <span>{restaurants.length}곳</span>
                </div>
              </div>

              <div className="restaurant-list">
                {restaurants.length === 0 ? (
                  <div className="empty-card">
                    <h3>등록된 식당이 없습니다</h3>
                    <p>어드민 모드에서 첫 리뷰를 추가해 주세요.</p>
                  </div>
                ) : (
                  restaurants.map((restaurant) => (
                    <button
                      key={restaurant.id}
                      type="button"
                      className="restaurant-list-item"
                      onClick={() => onSelectRestaurant(restaurant.id)}
                    >
                      <div>
                        <strong>{restaurant.name}</strong>
                        <p>{restaurant.address}</p>
                      </div>
                      <span>{restaurant.overallRating.toFixed(1)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
        <div className="detail-panel">
          <div className="detail-header">
            <button
              type="button"
              className="ghost-button icon-button"
              onClick={onBackToList}
              aria-label="목록으로"
              title="목록으로"
            >
              <BackIcon />
            </button>
            {selectedRestaurant && isAdmin ? (
              <div className="detail-actions">
                <button
                  type="button"
                  className="secondary-button icon-button"
                  onClick={() => onOpenEditModal(selectedRestaurant)}
                  aria-label="수정"
                  title="수정"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="ghost-button danger-button icon-button"
                  onClick={() => onDeleteRestaurant(selectedRestaurant)}
                  aria-label="삭제"
                  title="삭제"
                >
                  <TrashIcon />
                </button>
              </div>
            ) : null}
          </div>

          {selectedRestaurant ? (
            <>
              <div className="detail-hero">
                <p className="eyebrow">
                  {selectedRestaurant.district1} · {selectedRestaurant.district2} ·{' '}
                  {selectedRestaurant.district3}
                </p>
                <h2>{selectedRestaurant.name}</h2>
                <p>{selectedRestaurant.address}</p>
              </div>

              <div className="detail-card">
                <RatingLine label="총 별점" value={selectedRestaurant.overallRating} />
                <RatingLine label="맛 별점" value={selectedRestaurant.tasteRating} />
                <RatingLine label="위생/청결 별점" value={selectedRestaurant.cleanlinessRating} />
                <RatingLine label="식당 디자인 별점" value={selectedRestaurant.designRating} />
                <RatingLine label="서비스 별점" value={selectedRestaurant.serviceRating} />
                <RatingLine label="가성비 별점" value={selectedRestaurant.valueRating ?? 0} />
              </div>

              <div className="detail-card">
                <div className="section-heading">
                  <h3>한줄평</h3>
                </div>
                <p className="detail-summary">{selectedRestaurant.summary}</p>
              </div>

              <div className="detail-card">
                <div className="section-heading">
                  <h3>먹었던 메뉴</h3>
                </div>
                <ul className="menu-detail-list">
                  {selectedRestaurant.menus.map((menu) => (
                    <li key={menu.id}>
                      <span>{menu.name}</span>
                      <strong>{menu.price}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      )}
      </aside>
      {filterPanel}
    </>
  )
}
