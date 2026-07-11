import { useState, useEffect } from 'react';

/**
 * Debounce a rapidly-changing value (e.g. a search input). The returned value
 * only updates after `delay` ms of no changes, so downstream effects/queries
 * fire once the user stops typing instead of on every keystroke.
 *
 *   const debounced = useDebounce(searchTerm, 350)
 *   useEffect(() => { fetchProducts({ search: debounced }) }, [debounced])
 */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
