import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function AdminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="h-12 flex items-center justify-between px-6 border-t border-gray-100 bg-white text-xs text-gray-400 shrink-0">
      <span>
        &copy; {year}{' '}
        <span className="font-semibold text-[#FF6B35]">ePasaley</span>. All rights reserved.
      </span>
      <span className="flex items-center gap-1">
        Built with <Heart className="w-3 h-3 text-[#FF6B35] fill-[#FF6B35]" /> for Nepal
      </span>
      <div className="hidden sm:flex items-center gap-4">
        <Link to="/" className="hover:text-[#1A3C8A] transition-colors">Store</Link>
        <span>v1.0.0</span>
      </div>
    </footer>
  );
}
