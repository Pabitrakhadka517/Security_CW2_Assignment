import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Format product name to proper title case
// "WIRELESS HEADPHONES" -> "Wireless Headphones"
// "nike air max" -> "Nike Air Max"
export function formatProductName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Format currency to NRS — delegates to the centralized currency config
// (src/config) so there is a single source of truth for money formatting.
export { formatCurrency, formatPrice, CURRENCY } from '@/config'

// Centralized stock status logic — single source of truth for inventory messaging.
//   stock > 10  -> In Stock
//   stock 1–10  -> Only X left — order before it's gone!
//   stock 0     -> Out of Stock
export function getStockStatus(stock) {
  const n = Number(stock) || 0
  if (n <= 0) {
    return { state: 'out', inStock: false, label: 'Out of Stock', short: 'Out of Stock', tone: 'danger' }
  }
  if (n <= 10) {
    return {
      state: 'low',
      inStock: true,
      count: n,
      label: `Only ${n} left — order before it's gone!`,
      short: `Only ${n} left`,
      tone: 'warning',
    }
  }
  return { state: 'in', inStock: true, count: n, label: 'In Stock', short: 'In Stock', tone: 'success' }
}
