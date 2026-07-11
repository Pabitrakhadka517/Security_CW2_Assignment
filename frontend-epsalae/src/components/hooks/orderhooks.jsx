// src/hooks/useOrders.jsx
import { useOrderStore } from '../store/orderstore';

export const useOrders = () => {
  const store = useOrderStore();
  return store;
};