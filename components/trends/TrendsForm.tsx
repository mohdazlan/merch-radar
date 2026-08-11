"use client";

import { useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";

const MAX_KEYWORDS = 5;
const MIN_KEYWORDS = 1;

const inputCls =
  "h-11 w-full border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-2 focus:border-accent";

export function TrendsForm({
  onCompare,
  loading,
}: {
  onCompare: (keywords: string[]) => void;
  loading: boolean;
}) {
  const [keywords, setKeywords] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);

  function updateKeyword(i: number, value: string) {
    setKeywords((prev) => prev.map((k, idx) => (idx === i ? value : k)));
  }

  function addKeyword() {
    if (keywords.length >= MAX_KEYWORDS) return;
    setKeywords((prev) => [...prev, ""]);
  }

  function removeKeyword(i: number) {
    setKeywords((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = keywords.map((k) => k.trim()).filter((k) => k.length >= 2);
    if (cleaned.length < MIN_KEYWORDS) {
      setError("Enter at least one product idea (2+ characters) to compare.");
      return;
    }
    setError(null);
    onCompare(cleaned);
  }

  return (
    <form onSubmit={submit} noValidate className="border border-line bg-surface/50 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-2">
        Product ideas to compare ({keywords.length}/{MAX_KEYWORDS})
      </p>
      <div className="space-y-2">
        {keywords.map((k, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={k}
              onChange={(e) => updateKeyword(i, e.target.value)}
              placeholder={`e.g. ${["silicone oven glove", "stanley tumbler dupe", "phone camera lens kit"][i % 3]}`}
              className={inputCls}
            />
            {keywords.length > 1 && (
              <button
                type="button"
                onClick={() => removeKeyword(i)}
                aria-label={`Remove keyword ${i + 1}`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-line hover:border-ink-2"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addKeyword}
          disabled={keywords.length >= MAX_KEYWORDS}
          className="inline-flex h-10 items-center gap-1.5 border border-line px-3 text-xs font-medium hover:border-ink-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={13} aria-hidden />
          Add another idea
        </button>
        <span className="flex-1" />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 border border-accent bg-accent/15 px-6 text-sm font-bold uppercase tracking-wide text-ink hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden />
              Comparing…
            </>
          ) : (
            <>
              <Search size={15} aria-hidden />
              Compare live
            </>
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-loss-text">
          {error}
        </p>
      )}
    </form>
  );
}
