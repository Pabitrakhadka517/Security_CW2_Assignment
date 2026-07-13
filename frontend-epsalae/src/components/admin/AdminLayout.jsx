import { useState, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './sidebar';
import AdminHeader from './AdminHeader';
import AdminFooter from './AdminFooter';
import { TableSkeleton } from '../ui/Skeleton';

// Code-split each admin screen so the initial admin bundle stays small —
// a screen's JS is only fetched when the user navigates to it.
const AdminDashboard   = lazy(() => import('../../pages/AdminDashboard'));
const ProductCrud      = lazy(() => import('./productcrud'));
const CategoryCrud     = lazy(() => import('./categorycrud'));
const OrderCrud        = lazy(() => import('./ordercrud'));
const PromoCodCrud     = lazy(() => import('./promocodecrud'));
const BannerCrud       = lazy(() => import('./bannercrud'));
const SaleCrud         = lazy(() => import('./salecrud'));
const SaleProductsCrud = lazy(() => import('./saleproductscrud'));
const WishlistCrud     = lazy(() => import('./wishlistcrud'));
const BulkUpload       = lazy(() => import('./bulkupload'));
const SecurityDashboard = lazy(() => import('./SecurityDashboard'));

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8F9FF] font-sans">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column: header + content + footer */}
      <div className="flex flex-col flex-1 min-h-screen lg:ml-64">
        {/* Top Header */}
        <AdminHeader
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          sidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="flex-1 mt-[70px] p-5 md:p-7 overflow-auto">
          <Suspense fallback={<div className="space-y-4"><TableSkeleton rows={8} cols={6} /></div>}>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/categorycrud" element={<CategoryCrud />} />
              <Route path="/productcrud" element={<ProductCrud />} />
              <Route path="/ordercrud" element={<OrderCrud />} />
              <Route path="/promocodecrud" element={<PromoCodCrud />} />
              <Route path="/bannercrud" element={<BannerCrud />} />
              <Route path="/salecrud" element={<SaleCrud />} />
              <Route path="/saleproducts" element={<SaleProductsCrud />} />
              <Route path="/wishlists" element={<WishlistCrud />} />
              <Route path="/bulk-upload" element={<BulkUpload />} />
              <Route path="/security" element={<SecurityDashboard />} />
            </Routes>
          </Suspense>
        </main>

        {/* Footer */}
        <AdminFooter />
      </div>
    </div>
  );
}
