// Mirrors the Pydantic models in backend/models.py.

export interface SizeStock {
  size: string
  quantity: number
}

export interface Product {
  product_id: string
  name: string
  garment_type: string
  description: string
  short_description: string
  colors: string[]
  search_tags: string[]
  image_url: string
  price: number
  inventory: SizeStock[]
  total_stock: number
}

export interface ProductList {
  products: Product[]
  total: number
}

export interface PublicUser {
  id: number
  name: string
  email: string
  first_name: string | null
  last_name: string | null
}
