/** Shared numeric helpers — pure, deterministic (Rule 1). */

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** linear-interpolated percentile, p in [0,1] */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const idx = p * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
}

export function stddev(xs: number[]): number {
  return Math.sqrt(variance(xs));
}

/** drop the top and bottom `frac` of values (spec §5.2: 5% each end) */
export function trimOutliers(xs: number[], frac = 0.05): number[] {
  if (xs.length === 0) return [];
  const s = [...xs].sort((a, b) => a - b);
  const drop = Math.floor(s.length * frac);
  return drop === 0 ? s : s.slice(drop, s.length - drop);
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

/** round to cents so the waterfall is reproducible by hand */
export function cents(x: number): number {
  return Math.round(x * 100) / 100;
}
