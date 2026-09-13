// Session/auth storage — ported from assets/js/app.js's getAuthToken/setAuthSession/clearAuth.
const AUTH_TOKEN_KEY = 'rms_auth_token';
const AUTH_INFO_KEY = 'rms_auth_info';

export interface AuthInfo {
  name: string;
  role: string;
}

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthSession(token: string, info: AuthInfo, remember: boolean) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(AUTH_TOKEN_KEY, token);
  store.setItem(AUTH_INFO_KEY, JSON.stringify(info));
}

export function getAuthInfo(): AuthInfo | null {
  const raw = localStorage.getItem(AUTH_INFO_KEY) || sessionStorage.getItem(AUTH_INFO_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_INFO_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_INFO_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}
