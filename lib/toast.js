'use client';
export function toast(msg) {
  if (typeof document === 'undefined') return;
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
}
export async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.ok === false) throw new Error(data.error || 'Something went wrong');
  return data;
}
export function initials(name = '') { return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(); }
export const AV_COLORS = ['#0E9594', '#E4572E', '#3A7CA5', '#7FB069', '#D1603D', '#46536A', '#B45309', '#101210'];
export function colorFor(id = 0) { return AV_COLORS[Math.abs(id) % AV_COLORS.length]; }
export function Taka({ children }) { return <span className="taka">{children}</span>; }
