// Environment config — mirrors the static app's assets/js/config.js pattern.
// Set VITE_API_URL per environment via .env.local / .env.uat / .env.production (Vercel env vars).
// SUPABASE_FUNCTIONS_URL is the new backend (Step 2 migration); when set, api.ts routes there
// instead of the legacy Apps Script API_URL.
export const CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || '',
  SUPABASE_FUNCTIONS_URL: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '',
};
