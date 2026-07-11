// src/hooks/useBanners.jsx
import { useEffect } from 'react';
import { useBannerStore } from '../store/bannerstore';

export const useBanners = () => {
  const { banners, loading, error, fetchBanners } = useBannerStore();

  useEffect(() => {
    if (banners.length === 0) fetchBanners();
  }, []);

  return { banners, loading, error, refetch: fetchBanners };
};