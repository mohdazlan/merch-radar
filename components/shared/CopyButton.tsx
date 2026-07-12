"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-1.5 border border-line px-3 text-sm font-medium hover:border-ink-2"
      aria-live="polite"
    >
      {copied ? (
        <Check size={14} className="text-gain-text" aria-hidden />
      ) : (
        <Copy size={14} aria-hidden />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
