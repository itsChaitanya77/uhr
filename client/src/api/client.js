import axios from 'axios';

const TOKEN_KEY = 'uhr_token';
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/login') && !url.includes('/emergency/activate')) onUnauthorized();
    return Promise.reject(error);
  }
);

/** Normalises an axios error into { message, fieldErrors, code, status }. */
export function apiError(error) {
  const data = error.response?.data;
  return {
    message: data?.message || (error.request ? 'Cannot reach the server. Is the API running?' : 'Something went wrong'),
    fieldErrors: data?.errors || {},
    code: data?.code,
    status: error.response?.status,
  };
}

/** Opens an authenticated file (PDF/image) in a new tab. */
export async function openReportFile(reportId) {
  const res = await api.get(`/files/report/${reportId}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default api;
