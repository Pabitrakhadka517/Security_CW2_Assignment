// ============================================================
// GLOBAL CONFIGURATION — Single source of truth for all API URLs
// Every file in this project must import from here.
// DO NOT define API_BASE_URL or API_URL anywhere else.
//
// To configure: set VITE_API_BASE_URL in your .env file
//   Development:  VITE_API_BASE_URL=http://localhost:4000
//   Production:   VITE_API_BASE_URL=https://api.epasaley.com
// ============================================================

// Environment check
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Base URL of the backend server (no trailing slash)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (isDevelopment ? 'http://localhost:5000' : '');

// Warn loudly if the production build was shipped without a backend URL.
if (!isDevelopment && !import.meta.env.VITE_API_BASE_URL) {
  console.error('VITE_API_BASE_URL is not set!');
}

// Full API prefix — all endpoints hang off this
export const API_URL = `${API_BASE_URL}/api/v1`;

// App Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Epasaley';
export const APP_DESCRIPTION = import.meta.env.VITE_APP_DESCRIPTION || "Nepal's Trusted Online Store";

// ============================================================
// CURRENCY — Single source of truth for money formatting.
// The platform targets Nepal, so the currency is always Rupees (Rs.).
// Never hardcode a currency symbol anywhere — import these helpers.
// ============================================================
export const CURRENCY = {
  code: 'NPR',
  symbol: 'Rs.',
  locale: 'en-IN', // en-IN gives the lakh/crore-friendly grouping used in Nepal
};

/**
 * Format a numeric amount as a currency string, e.g. 1250 -> "Rs. 1,250".
 * @param {number|string} amount
 * @param {{ decimals?: number, symbol?: boolean }} [opts]
 */
export const formatCurrency = (amount, opts = {}) => {
  const { decimals = 0, symbol = true } = opts;
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const num = safe.toLocaleString(CURRENCY.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return symbol ? `${CURRENCY.symbol} ${num}` : num;
};

// Convenience alias used across the app.
export const formatPrice = (amount, opts) => formatCurrency(amount, opts);

// Default placeholder image - Generic product placeholder
export const PLACEHOLDER = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E';

// Helper function to get full image URL
// Handles: Cloudinary URLs, old local paths, and missing images
export const getImageUrl = (imagePath, placeholder = PLACEHOLDER) => {
  if (!imagePath) return placeholder;

  // Already a full URL (Cloudinary, Unsplash, etc.) or an inline base64 data
  // URL (admin uploads) — use directly so the real uploaded image always shows.
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Old local path (/uploads/...) - these images are lost, show placeholder
  // User needs to re-upload via admin panel to get Cloudinary URL
  if (imagePath.startsWith('/uploads')) {
    // Only warn in development to keep production console clean
    if (isDevelopment) {
      console.warn('⚠️ Old local image path detected. Please re-upload this image:', imagePath);
    }
    return placeholder;
  }

  // Fallback for any other paths
  return placeholder;
};

// ============================================
// DESIGN SYSTEM - Premium Deep Blue & Orange Theme
// ============================================

export const theme = {
  // Primary Colors
  colors: {
    primary: '#1A3C8A',      // Deep Blue - Main brand color
    primaryDark: '#112960',  // Darker blue for hover states
    primaryLight: '#2D52B2', // Lighter blue for backgrounds

    brandOrange: '#FF6B35',  // Vibrant Orange - Branding & accents
    brandOrangeDark: '#E0531F', // Darker orange
    brandOrangeLight: '#FF885B', // Lighter orange

    success: '#10B981',      // Emerald Green - Success, checkout
    successDark: '#059669',  // Darker green
    successLight: '#34D399', // Lighter green

    // Neutrals
    white: '#FFFFFF',
    background: '#F9FAFB',   // Soft gray background
    surface: '#FFFFFF',      // Card backgrounds
    border: '#F3F4F6',       // Border color

    // Text
    textPrimary: '#111827',  // Main text
    textSecondary: '#4B5563', // Secondary text
    textMuted: '#9CA3AF',    // Muted text

    // Status Colors
    warning: '#F5A623',
    error: '#EF4444',
    info: '#3B82F6',

    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #1A3C8A 0%, #FF6B35 100%)',
    gradientBlue: 'linear-gradient(135deg, #1A3C8A 0%, #2D52B2 100%)',
    gradientOrange: 'linear-gradient(135deg, #FF6B35 0%, #FF885B 100%)',
  },

  // Border Radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    card: '0 10px 30px rgba(26, 60, 138, 0.04)',
    button: '0 10px 20px rgba(255, 107, 53, 0.15)',
  },

  // Typography
  fonts: {
    heading: "'Inter', -apple-system, sans-serif",
    body: "'Inter', -apple-system, sans-serif",
  },
};
