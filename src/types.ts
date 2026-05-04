export type RatingField =
  | 'overallRating'
  | 'tasteRating'
  | 'cleanlinessRating'
  | 'designRating'
  | 'serviceRating'
  | 'valueRating'

export type MenuItem = {
  id: string
  name: string
  price: string
}

export type Restaurant = {
  id: string
  name: string
  address: string
  district1: string
  district2: string
  district3: string
  latitude: number
  longitude: number
  overallRating: number
  tasteRating: number
  cleanlinessRating: number
  designRating: number
  serviceRating: number
  valueRating: number
  summary: string
  menus: MenuItem[]
  createdAt: string
  updatedAt: string
}

export type RatingFilterValue = string

export type RestaurantFilters = {
  district1: string
  district2: string
  district3: string
  overallRating: RatingFilterValue
  tasteRating: RatingFilterValue
  cleanlinessRating: RatingFilterValue
  designRating: RatingFilterValue
  serviceRating: RatingFilterValue
  valueRating: RatingFilterValue
}

export type SortOption =
  | 'name'
  | 'overallRating'
  | 'tasteRating'
  | 'cleanlinessRating'
  | 'designRating'
  | 'serviceRating'
  | 'valueRating'

export type RestaurantDraft = Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt'>
