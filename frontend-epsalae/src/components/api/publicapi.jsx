// Public axios client — NO auth token attached. Use for endpoints that are
// public by contract (order tracking, public catalogue reads from public pages)
// so a stale admin/user token can never leak onto them or trigger refresh loops.
import axios from 'axios';
import { API_URL } from '@/config';

const publicApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

export default publicApi;
