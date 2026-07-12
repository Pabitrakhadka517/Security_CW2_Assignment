// Product Types
export interface IProductImage {
  url: string;
  alt?: string;
  order?: number;
  publicId?: string | null;
}

export interface IProductVariant {
  id: string;
  sku: string;
  options: Record<string, string>; // { size: 'L', color: 'Red', material: 'cotton', ... }
  price: number;
  discountPrice?: number;
  stock: number;
  lowStockThreshold?: number | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface IProductSeo {
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
  ogImage?: string | null;
}

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface IProduct {
  id: string;
  name: string;
  description: string | null;
  // Legacy single-SKU fields (still in use when `variants` is empty)
  price: number;
  discountPrice: number;
  hasOffer: boolean;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  imageUrl: string;
  stock: number;
  // Multi-image gallery
  images?: IProductImage[];
  // Variants — when non-empty, these are authoritative for price/stock
  variants?: IProductVariant[];
  // Classification
  tags?: string[];
  attributes?: Record<string, string>;
  // SEO
  seo?: IProductSeo;
  // Lifecycle
  status?: ProductStatus;
  lowStockThreshold?: number;
  category_id: string;
  isActive: boolean;
  createdAt: Date;
}

// Order Types
export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface IOrder {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email?: string | null;
  paymentMethod?: 'cod' | 'khalti' | 'esewa' | 'card' | 'bank_transfer';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  phone: string | number;
  district: string;
  city: string;
  address: string;
  description: string;
  items: IOrderItem[];
  couponCode?: string | null;
  discountAmount?: number;
  vatAmount?: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'sent' | 'on_the_way' | 'out_for_delivery' | 'shipped' | 'delivered' | 'received' | 'reached' | 'cancelled';
  statusHistory?: Array<{ status: string; note?: string | null; location?: string | null; timestamp: string }>;
  created_at: string;
}

// Category Types
export interface ICategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  parentId?: string | null;
  ancestors?: string[];
  depth?: number;
  sortOrder?: number;
  created_at: string;
}

// Banner Types
export interface IBanner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  position?: 'hero' | 'promo' | 'strip';
  displayOrder?: number;
  isActive: boolean;
  created_at: string;
}

// Coupon Types
export interface ICoupon {
  code: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  apply_on: 'cart' | 'product' | 'category';
  applicable_products?: string[];
  applicable_categories?: string[];
  validFrom: string | Date;
  validTo: string | Date;
  usage_limit?: number | null;
  usage_count?: number;
  per_user_limit?: number | null;
  min_order_amount?: number;
  isActive: boolean;
  created_at: string;
}

export interface ICreateCouponBody {
  code: string;
  description?: string | null;
  discount_type?: 'percentage' | 'fixed';
  discount_value: number;
  apply_on?: 'cart' | 'product' | 'category';
  applicable_products?: string[];
  applicable_categories?: string[];
  validFrom: string | Date;
  validTo: string | Date;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  min_order_amount?: number;
  isActive?: boolean;
}

// Query Parameters
export interface IPaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface IProductQuery extends IPaginationQuery {
  category_id?: string;
  hasOffer?: boolean;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
}

export interface IOrderQuery extends IPaginationQuery {
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

// Request Body Types
export interface ICreateProductBody {
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  hasOffer?: boolean;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  stock?: number;
  category_id: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ICreateOrderBody {
  user_id?: string;
  first_name?: string;
  last_name?: string;
  name: string;
  email?: string | null;
  paymentMethod?: 'cod' | 'khalti' | 'esewa' | 'card' | 'bank_transfer';
  phone: string | number;
  district: string;
  city: string;
  address: string;
  description: string;
  items: IOrderItem[];
  couponCode?: string | null;
  totalAmount: number;
}

export interface ICreateCategoryBody {
  name: string;
  description: string;
  isActive?: boolean;
}

export interface ICreateBannerBody {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string | null;
  position?: 'hero' | 'promo' | 'strip';
  displayOrder?: number;
  isActive?: boolean;
}

// Password Policy Types
export interface IPasswordStrengthResult {
  valid: boolean;
  score: number;
  feedback: string[];
}

export interface IPasswordComplexityResult {
  valid: boolean;
  errors: string[];
}

export interface IPasswordChangeResult {
  valid: boolean;
  error: string;
}


