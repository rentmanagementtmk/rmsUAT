// Formatting helpers — ported from assets/js/app.js.
export function inr(amount: number | string): string {
  const n = Number(amount);
  const opts: Intl.NumberFormatOptions = Number.isInteger(n)
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return '₹' + n.toLocaleString('en-IN', opts);
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = MONTHS_SHORT[d.getMonth()];
  const yr = d.getFullYear();
  let h = d.getHours();
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}-${mo}-${yr} ${h}:${mi} ${ap}`;
}

export function fmtDateOnly(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS_SHORT[d.getMonth()]}-${d.getFullYear()}`;
}

/** Returns { month, year } of the previous calendar month (1-based month) */
export function prevMonth(): { month: number; year: number } {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y };
}
