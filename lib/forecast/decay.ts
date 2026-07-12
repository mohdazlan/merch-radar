/**
 * §6 predictive decay forecast — an honest model, not a guess dressed as a
 * prophecy. OLS on log(price) vs days; projects 30/60/90 days with a ±1σ
 * band. Refuses to forecast with fewer than MIN_POINTS sold data points —
 * refusing is a feature.
 */

export const MIN_POINTS = 12;
const DAY_MS = 86_400_000;

export type SoldPoint = { date: string; price: number };

export type ForecastPoint = {
  /** days from the first observation */
  day: number;
  price: number;
  lower: number;
  upper: number;
};

export type Forecast =
  | {
      status: "OK";
      n: number;
      /** fractional price change projected over 90 days; negative = decay */
      slopePer90d: number;
      /** residual std error in log space */
      sigma: number;
      /** fitted line over the observed window */
      fitted: ForecastPoint[];
      /** dashed MODELED projection at +30/+60/+90 days from the last observation */
      projections: ForecastPoint[];
    }
  | { status: "INSUFFICIENT_DATA"; n: number };

export function fitDecay(series: SoldPoint[]): Forecast {
  const clean = series.filter((p) => p.price > 0 && !isNaN(Date.parse(p.date)));
  if (clean.length < MIN_POINTS) {
    return { status: "INSUFFICIENT_DATA", n: clean.length };
  }

  const t0 = Math.min(...clean.map((p) => Date.parse(p.date)));
  const xs = clean.map((p) => (Date.parse(p.date) - t0) / DAY_MS);
  const ys = clean.map((p) => Math.log(p.price));
  const n = clean.length;

  const xBar = xs.reduce((a, b) => a + b, 0) / n;
  const yBar = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - xBar) ** 2;
    sxy += (xs[i] - xBar) * (ys[i] - yBar);
  }
  if (sxx === 0) {
    // all observations on one day — no time axis to regress on
    return { status: "INSUFFICIENT_DATA", n };
  }

  const b = sxy / sxx; // log-price change per day
  const a = yBar - b * xBar;

  // residual standard error (log space)
  let sse = 0;
  for (let i = 0; i < n; i++) {
    sse += (ys[i] - (a + b * xs[i])) ** 2;
  }
  const sigma = Math.sqrt(sse / Math.max(n - 2, 1));

  const point = (day: number): ForecastPoint => {
    const logP = a + b * day;
    return {
      day,
      price: round2(Math.exp(logP)),
      lower: round2(Math.exp(logP - sigma)),
      upper: round2(Math.exp(logP + sigma)),
    };
  };

  const lastDay = Math.max(...xs);
  return {
    status: "OK",
    n,
    slopePer90d: Math.exp(b * 90) - 1,
    sigma,
    fitted: [point(0), point(lastDay)],
    projections: [point(lastDay + 30), point(lastDay + 60), point(lastDay + 90)],
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
