export const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || "http://127.0.0.1:8000";

// Clean environment/config switch for Demo Mode vs Strict Real Backend Mode
// When DEMO_MODE=false: Backend/API failures throw or return errors; DO NOT silently replace with mock success/data.
// When DEMO_MODE=true: Backend/API failures fall back to demo fallback data.
export const DEMO_MODE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEMO_MODE !== undefined)
  ? (import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_DEMO_MODE === true)
  : false; // Default: false (strict real backend source of truth)

