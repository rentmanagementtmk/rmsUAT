// Environment config — mirrors the static app's assets/js/config.js pattern.
// Set VITE_API_URL per environment via .env.local / .env.uat / .env.production (Vercel env vars).
export const CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || '',
};
