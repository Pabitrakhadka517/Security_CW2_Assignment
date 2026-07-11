// src/hooks/useCoupons.jsx
import { useCouponStore } from '../store/promocodestore';

export const useCoupons = () => {
  const store = useCouponStore();
  return store;
};