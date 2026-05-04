import { useEffect, useState } from 'react'
import { geocodeAddress } from '../lib/geocoding'
import type { MenuItem, Restaurant, RestaurantDraft } from '../types'
import { CheckIcon, CloseIcon, PlusIcon, SearchIcon, TrashIcon } from './Icons'
import { StarRating } from './StarRating'

type RestaurantFormModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  initialValue?: Restaurant | null
  regionData: {
    code: string
    name: string
    districts: {
      code: string
      name: string
      neighborhoods: {
        code: string
        name: string
      }[]
    }[]
  }[]
  onClose: () => void
  onSubmit: (draft: RestaurantDraft) => void
}

type FormState = RestaurantDraft

function createEmptyDraft(): FormState {
  return {
    name: '',
    address: '',
    district1: '',
    district2: '',
    district3: '',
    latitude: 0,
    longitude: 0,
    overallRating: 4,
    tasteRating: 4,
    cleanlinessRating: 4,
    designRating: 4,
    serviceRating: 4,
    valueRating: 4,
    summary: '',
    menus: [{ id: crypto.randomUUID(), name: '', price: '' }],
  }
}

function normalizeRating(value: number) {
  const rounded = Math.round(value * 2) / 2
  return Math.min(5, Math.max(0, rounded))
}

export function RestaurantFormModal({
  isOpen,
  mode,
  initialValue,
  regionData,
  onClose,
  onSubmit,
}: RestaurantFormModalProps) {
  const [form, setForm] = useState<FormState>(createEmptyDraft)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [lastGeocodedAddress, setLastGeocodedAddress] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (initialValue) {
      setLastGeocodedAddress(initialValue.address)
      setForm({
        name: initialValue.name,
        address: initialValue.address,
        district1: initialValue.district1,
        district2: initialValue.district2,
        district3: initialValue.district3,
        latitude: initialValue.latitude,
        longitude: initialValue.longitude,
        overallRating: initialValue.overallRating,
        tasteRating: initialValue.tasteRating,
        cleanlinessRating: initialValue.cleanlinessRating,
        designRating: initialValue.designRating,
        serviceRating: initialValue.serviceRating,
        valueRating: initialValue.valueRating ?? 0,
        summary: initialValue.summary,
        menus: initialValue.menus.length
          ? initialValue.menus
          : [{ id: crypto.randomUUID(), name: '', price: '' }],
      })
    } else {
      setLastGeocodedAddress('')
      setForm(createEmptyDraft())
    }

    setIsGeocoding(false)
    setErrorMessage('')
  }, [initialValue, isOpen])

  if (!isOpen) {
    return null
  }

  const district1Options = regionData.map((region) => region.name)
  const selectedRegion = regionData.find((region) => region.name === form.district1)
  const district2Options = selectedRegion
    ? selectedRegion.districts.map((district) => district.name)
    : Array.from(new Set(regionData.flatMap((region) => region.districts.map((district) => district.name))))
        .sort((left, right) => left.localeCompare(right, 'ko'))

  const selectedDistrict = selectedRegion?.districts.find((district) => district.name === form.district2)
  const district3Options = selectedDistrict
    ? selectedDistrict.neighborhoods.map((neighborhood) => neighborhood.name)
    : selectedRegion
      ? Array.from(
          new Set(
            selectedRegion.districts.flatMap((district) =>
              district.neighborhoods.map((neighborhood) => neighborhood.name),
            ),
          ),
        ).sort((left, right) => left.localeCompare(right, 'ko'))
      : Array.from(
          new Set(
            regionData.flatMap((region) =>
              region.districts.flatMap((district) =>
                district.neighborhoods.map((neighborhood) => neighborhood.name),
              ),
            ),
          ),
        ).sort((left, right) => left.localeCompare(right, 'ko'))

  const updateMenu = (menuId: string, field: keyof MenuItem, value: string) => {
    setForm((current) => ({
      ...current,
      menus: current.menus.map((menu) =>
        menu.id === menuId ? { ...menu, [field]: value } : menu,
      ),
    }))
  }

  const handleSubmit = async () => {
    const cleanMenus = form.menus.filter((menu) => menu.name.trim() && menu.price.trim())

    if (!form.name.trim() || !form.address.trim() || !form.summary.trim()) {
      setErrorMessage('식당 이름, 주소, 한줄평은 반드시 입력해 주세요.')
      return
    }

    if (!form.district1.trim() || !form.district2.trim() || !form.district3.trim()) {
      setErrorMessage('행정구역 3단계 필드를 모두 입력해 주세요.')
      return
    }

    if (cleanMenus.length === 0) {
      setErrorMessage('음식명과 가격을 최소 1개 이상 입력해 주세요.')
      return
    }

    let latitude = form.latitude
    let longitude = form.longitude
    const trimmedAddress = form.address.trim()
    const coordsLookUnset =
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      (latitude === 0 && longitude === 0)

    if (coordsLookUnset || trimmedAddress !== lastGeocodedAddress) {
      try {
        setIsGeocoding(true)
        setErrorMessage('')
        const result = await geocodeAddress(trimmedAddress)
        latitude = result.latitude
        longitude = result.longitude
      } catch (error) {
        const message = error instanceof Error ? error.message : '주소 검색 중 오류가 발생했습니다.'
        setErrorMessage(`주소로 좌표를 찾지 못했습니다: ${message}`)
        setIsGeocoding(false)
        return
      }
      setIsGeocoding(false)
    }

    onSubmit({
      ...form,
      name: form.name.trim(),
      address: trimmedAddress,
      district1: form.district1.trim(),
      district2: form.district2.trim(),
      district3: form.district3.trim(),
      summary: form.summary.trim(),
      menus: cleanMenus,
      latitude,
      longitude,
      overallRating: normalizeRating(form.overallRating),
      tasteRating: normalizeRating(form.tasteRating),
      cleanlinessRating: normalizeRating(form.cleanlinessRating),
      designRating: normalizeRating(form.designRating),
      serviceRating: normalizeRating(form.serviceRating),
      valueRating: normalizeRating(form.valueRating),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card restaurant-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restaurant-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{mode === 'create' ? 'Add restaurant' : 'Edit restaurant'}</p>
            <h2 id="restaurant-form-title">
              {mode === 'create' ? '식당 리뷰 추가' : '식당 리뷰 수정'}
            </h2>
          </div>
          <button
            type="button"
            className="ghost-button icon-button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="form-grid">
          <label className="field field-span-2">
            <span>식당 이름</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="예: 성수 소금집"
            />
          </label>

          <label className="field field-span-2">
            <span>주소</span>
            <div className="inline-field">
              <input
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                placeholder="예: 서울특별시 성동구 연무장길 45"
              />
              <button
                type="button"
                className="secondary-button icon-button"
                disabled={isGeocoding || !form.address.trim()}
                aria-label={isGeocoding ? '주소 검색 중' : '주소로 좌표 찾기'}
                title={isGeocoding ? '주소 검색 중' : '주소로 좌표 찾기'}
                onClick={async () => {
                  try {
                    setIsGeocoding(true)
                    setErrorMessage('')
                    const result = await geocodeAddress(form.address)
                    setForm((current) => ({
                      ...current,
                      latitude: result.latitude,
                      longitude: result.longitude,
                      district1: result.district1,
                      district2: result.district2,
                      district3: result.district3,
                    }))
                    setLastGeocodedAddress(form.address)
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : '주소 검색 중 오류가 발생했습니다.'
                    setErrorMessage(message)
                  } finally {
                    setIsGeocoding(false)
                  }
                }}
              >
                <SearchIcon />
              </button>
            </div>
          </label>

          <label className="field">
            <span>시/도</span>
            <select
              value={form.district1}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  district1: event.target.value,
                  district2: '',
                  district3: '',
                }))
              }
            >
              <option value="">시/도 선택</option>
              {district1Options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>시/군/구</span>
            <select
              value={form.district2}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  district2: event.target.value,
                  district3: '',
                }))
              }
            >
              <option value="">시/군/구 선택</option>
              {district2Options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>읍/면/동</span>
            <select
              value={form.district3}
              onChange={(event) =>
                setForm((current) => ({ ...current, district3: event.target.value }))
              }
            >
              <option value="">읍/면/동 선택</option>
              {district3Options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {[
            ['총 별점', 'overallRating'],
            ['맛 별점', 'tasteRating'],
            ['위생/청결 별점', 'cleanlinessRating'],
            ['식당 디자인 별점', 'designRating'],
            ['서비스 별점', 'serviceRating'],
            ['가성비 별점', 'valueRating'],
          ].map(([label, key]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <StarRating
                value={form[key as keyof FormState] as number}
                onChange={(nextValue) =>
                  setForm((current) => ({
                    ...current,
                    [key]: nextValue,
                  }))
                }
              />
            </label>
          ))}

          <label className="field field-span-2">
            <span>한줄평</span>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
              placeholder="예: 깔끔하고 재료 밸런스가 좋았음"
            />
          </label>
        </div>

        <div className="menu-editor">
          <div className="section-heading">
            <h3>음식명과 가격</h3>
            <button
              type="button"
              className="secondary-button icon-button"
              aria-label="메뉴 추가"
              title="메뉴 추가"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  menus: [...current.menus, { id: crypto.randomUUID(), name: '', price: '' }],
                }))
              }
            >
              <PlusIcon />
            </button>
          </div>

          <div className="menu-list">
            {form.menus.map((menu, index) => (
              <div key={menu.id} className="menu-row">
                <label className="field">
                  <span>음식명 {index + 1}</span>
                  <input
                    value={menu.name}
                    onChange={(event) => updateMenu(menu.id, 'name', event.target.value)}
                    placeholder="예: 명란오일파스타"
                  />
                </label>
                <label className="field">
                  <span>가격</span>
                  <input
                    value={menu.price}
                    onChange={(event) => updateMenu(menu.id, 'price', event.target.value)}
                    placeholder="예: 16,000원"
                  />
                </label>
                <button
                  type="button"
                  className="ghost-button danger-button icon-button"
                  disabled={form.menus.length === 1}
                  aria-label="메뉴 삭제"
                  title="메뉴 삭제"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      menus: current.menus.filter((currentMenu) => currentMenu.id !== menu.id),
                    }))
                  }
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button
            type="button"
            className="ghost-button icon-button"
            onClick={onClose}
            aria-label="취소"
            title="취소"
          >
            <CloseIcon />
          </button>
          <button
            type="button"
            className="primary-button icon-button"
            onClick={handleSubmit}
            disabled={isGeocoding}
            aria-label={
              isGeocoding ? '좌표 확인 중' : mode === 'create' ? '리뷰 저장' : '수정 저장'
            }
            title={
              isGeocoding ? '좌표 확인 중' : mode === 'create' ? '리뷰 저장' : '수정 저장'
            }
          >
            <CheckIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
