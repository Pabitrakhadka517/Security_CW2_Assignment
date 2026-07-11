// Reusable skeleton loaders — a modern replacement for spinners.
// Use these while server data is loading so layouts don't jump and the
// experience feels smooth. Pair naturally with React Query's `isLoading`.

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

/** A single product card placeholder (image + title + price + button). */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-sm">
      <Skeleton className="w-full aspect-square rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** A responsive grid of product card skeletons. */
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Category tiles placeholder. */
export function CategoryGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden bg-white border border-slate-100 rounded-2xl">
          <Skeleton className="w-full aspect-square rounded-none" />
          <div className="p-5"><Skeleton className="h-4 w-2/3 mx-auto" /></div>
        </div>
      ))}
    </div>
  );
}

/** Product detail page placeholder (gallery + info column). */
export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 max-w-7xl mx-auto p-4">
      <Skeleton className="w-full aspect-square rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-40" />
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="h-12 flex-1 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** Cart line items placeholder. */
export function CartSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
          <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Generic table placeholder for admin lists (products, orders, customers). */
export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div className="overflow-hidden bg-white border border-slate-100 rounded-2xl">
      <div className="flex gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-4 border-b border-slate-50">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Order cards placeholder. */
export function OrderListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
