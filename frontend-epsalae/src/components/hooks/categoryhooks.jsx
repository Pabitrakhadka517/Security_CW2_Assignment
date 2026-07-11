// src/hooks/useCategories.jsx
import { useEffect } from 'react';
import { useCategoryStore } from '../store/categorystore';

export const useCategories = () => {
  const { categories, loading, error, fetchCategories } = useCategoryStore();

  useEffect(() => {
    if (categories.length === 0) fetchCategories();
  }, []);

  return { categories, loading, error, refetch: fetchCategories };
};