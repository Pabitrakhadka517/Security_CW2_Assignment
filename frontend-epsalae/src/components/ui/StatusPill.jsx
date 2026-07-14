/** Standardized active/inactive indicator for admin CRUD tables — dot + text so status never relies on color alone. */
export default function StatusPill({ isActive }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
      ${isActive
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-gray-100 text-gray-500 border border-gray-200'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full
        ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}
        aria-hidden="true" />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export { StatusPill };
