"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { ScoutQuery } from "@/lib/scout/types";

/** a small, honest starter set — eBay has thousands of leaf categories */
const CATEGORIES: { id: string; label: string }[] = [
  { id: "", label: "All categories" },
  { id: "11700", label: "Home & Garden" },
  { id: "220", label: "Toys & Hobbies" },
  { id: "11450", label: "Clothing, Shoes & Accessories" },
  { id: "58058", label: "Computers/Tablets & Networking" },
  { id: "15032", label: "Cell Phones & Accessories" },
  { id: "293", label: "Consumer Electronics" },
  { id: "888", label: "Sporting Goods" },
  { id: "26395", label: "Health & Beauty" },
  { id: "1249", label: "Video Games & Consoles" },
];

const COUNTRIES: { code: string; label: string }[] = [
  { code: "", label: "Anywhere" },
  { code: "US", label: "United States" },
  { code: "MY", label: "Malaysia" },
  { code: "SG", label: "Singapore" },
  { code: "CN", label: "China" },
  { code: "GB", label: "United Kingdom" },
  { code: "JP", label: "Japan" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
];

const inputCls =
  "h-11 w-full border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-2 focus:border-accent";
const labelCls =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-2";

export function ScoutForm({
  onSearch,
  loading,
}: {
  onSearch: (q: ScoutQuery) => void;
  loading: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [matchMode, setMatchMode] = useState<"exact" | "relevance">("relevance");
  const [soldWindowDays, setSoldWindowDays] = useState<30 | 60 | 90>(90);
  const [categoryId, setCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [country, setCountry] = useState("");
  const [newSellerOnly, setNewSellerOnly] = useState(true);
  const [feedbackCap, setFeedbackCap] = useState("100");
  const [removeHighRisk, setRemoveHighRisk] = useState(true);
  const [sort, setSort] = useState<ScoutQuery["sort"]>("recent");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (keyword.trim().length < 2 && !categoryId) {
      errs.keyword =
        "Enter a keyword (2+ characters) or pick a category — eBay can't run a completely open search.";
    }
    const lo = minPrice === "" ? undefined : Number(minPrice);
    const hi = maxPrice === "" ? undefined : Number(maxPrice);
    if (lo !== undefined && (!Number.isFinite(lo) || lo < 0))
      errs.minPrice = "Minimum price must be 0 or more.";
    if (hi !== undefined && (!Number.isFinite(hi) || hi <= 0))
      errs.maxPrice = "Maximum price must be greater than 0.";
    if (lo !== undefined && hi !== undefined && lo > hi)
      errs.minPrice = "Minimum price can't be higher than the maximum.";
    const cap = Number(feedbackCap);
    if (newSellerOnly && (!Number.isFinite(cap) || cap < 0))
      errs.feedbackCap = "Feedback cap must be 0 or more.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSearch({
      keyword: keyword.trim(),
      matchMode,
      soldWindowDays,
      categoryId: categoryId || undefined,
      minPrice: lo,
      maxPrice: hi,
      itemLocationCountry: country || undefined,
      maxSellerFeedback: newSellerOnly ? cap : null,
      removeHighRisk,
      sort,
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="border border-line bg-surface/50 p-4"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="sc-keyword" className={labelCls}>
            Search keyword
          </label>
          <input
            id="sc-keyword"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. silicone oven glove — or leave blank and pick a category"
            className={inputCls}
            aria-invalid={Boolean(errors.keyword)}
            aria-describedby={errors.keyword ? "sc-keyword-err" : undefined}
          />
          {errors.keyword && (
            <p id="sc-keyword-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.keyword}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sc-match" className={labelCls}>
            Match
          </label>
          <select
            id="sc-match"
            value={matchMode}
            onChange={(e) => setMatchMode(e.target.value as "exact" | "relevance")}
            className={inputCls}
          >
            <option value="relevance">Relevance (broader)</option>
            <option value="exact">Exact phrase in title</option>
          </select>
        </div>

        <div>
          <label htmlFor="sc-window" className={labelCls}>
            Sold within
          </label>
          <select
            id="sc-window"
            value={soldWindowDays}
            onChange={(e) =>
              setSoldWindowDays(Number(e.target.value) as 30 | 60 | 90)
            }
            className={inputCls}
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 3 months</option>
          </select>
          <p className="mt-1 text-xs text-ink-2">
            Only applies once sold data is available — eBay hasn&apos;t
            approved that for this app yet, so this is ignored for now (see
            note under the results).
          </p>
        </div>

        <div>
          <label htmlFor="sc-category" className={labelCls}>
            Category
          </label>
          <select
            id="sc-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sc-min" className={labelCls}>
            Min price $
          </label>
          <input
            id="sc-min"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="any"
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.minPrice)}
            aria-describedby={errors.minPrice ? "sc-min-err" : undefined}
          />
          {errors.minPrice && (
            <p id="sc-min-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.minPrice}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sc-max" className={labelCls}>
            Max price $
          </label>
          <input
            id="sc-max"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="any"
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.maxPrice)}
            aria-describedby={errors.maxPrice ? "sc-max-err" : undefined}
          />
          {errors.maxPrice && (
            <p id="sc-max-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.maxPrice}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sc-country" className={labelCls}>
            Item location
          </label>
          <select
            id="sc-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputCls}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sc-sort" className={labelCls}>
            Sort by
          </label>
          <select
            id="sc-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as ScoutQuery["sort"])}
            className={inputCls}
          >
            <option value="recent">Newest first</option>
            <option value="feedback_asc">Newest sellers first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>

      {/* the strategic filter — given its own block because it's the point */}
      <fieldset className="mt-4 border border-line p-3">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-2">
          Seller filters
        </legend>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newSellerOnly}
              onChange={(e) => setNewSellerOnly(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Only sellers with feedback ≤
          </label>
          <div>
            <label htmlFor="sc-feedback" className="sr-only">
              Maximum seller feedback score
            </label>
            <input
              id="sc-feedback"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={feedbackCap}
              onChange={(e) => setFeedbackCap(e.target.value)}
              disabled={!newSellerOnly}
              className={`num h-11 w-24 border border-line bg-surface px-2 text-sm disabled:opacity-50`}
              aria-invalid={Boolean(errors.feedbackCap)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={removeHighRisk}
              onChange={(e) => setRemoveHighRisk(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Remove high-risk listings
          </label>
        </div>
        <p className="mt-2 max-w-prose text-xs text-ink-2">
          A seller with almost no feedback who is <em>already selling</em> is
          the signal worth copying — the product is carrying itself without
          reputation. eBay has no native feedback filter, so this is applied to
          the results after fetching; sellers whose feedback eBay doesn&apos;t
          report are dropped rather than assumed.
        </p>
        {errors.feedbackCap && (
          <p role="alert" className="mt-1 text-xs text-loss-text">
            {errors.feedbackCap}
          </p>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 border border-accent bg-accent/15 px-6 text-sm font-bold uppercase tracking-wide text-ink hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" aria-hidden />
            Searching…
          </>
        ) : (
          <>
            <Search size={15} aria-hidden />
            Find what&apos;s selling
          </>
        )}
      </button>
    </form>
  );
}
