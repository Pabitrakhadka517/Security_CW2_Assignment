// src/hooks/useProducts.jsx
import { useEffect } from 'react';
import { useProductStore } from '../store/productstore';

export const useProducts = () => {
  const { products, loading, error, fetchProducts } = useProductStore();

  useEffect(() => {
    if (products.length === 0) fetchProducts();
  }, []);

  return { products, loading, error, refetch: fetchProducts };
};