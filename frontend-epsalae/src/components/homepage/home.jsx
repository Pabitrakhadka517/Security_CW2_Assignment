import { useEffect } from 'react'
import Category from "./category";
import Trustability from "./trustability";
import Banner from "./banner";
import ProductsGrid from "./product";
import SaleSection from "./salesection";
import AdditionalContent from "./additionalcontent";
import FeaturedCarousel from './featuredCarousel'
import { useProductStore } from '../store/productstore'
import { useCategoryStore } from '../store/categorystore'

export default function Home() {
  const { fetchProducts } = useProductStore()
  const { fetchCategories } = useCategoryStore()

  useEffect(() => {
    // Ensure homepage has fresh products and categories
    fetchCategories()
    fetchProducts({ limit: 24 })
  }, [fetchCategories, fetchProducts])
  return (
    <div className="min-h-screen">
      <Banner />
      <Category />

      <AdditionalContent />

      <SaleSection />
      <FeaturedCarousel />
      <ProductsGrid />
      <Trustability />

    </div>
  );
}
