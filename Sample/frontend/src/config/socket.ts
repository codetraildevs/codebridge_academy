const configured = import.meta.env.VITE_SOCKET_URL;
const apiUrl = import.meta.env.VITE_API_URL;

function resolveSocketBaseUrl(): string {
  if (configured) return configured;
  if (apiUrl && !apiUrl.startsWith('/')) {
    return apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return 'http://localhost:4000';
}

export const SOCKET_BASE_URL = resolveSocketBaseUrl();