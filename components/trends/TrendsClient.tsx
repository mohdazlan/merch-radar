"use client";

import { useCallback, useState } from "react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";
import { ErrorState } from "@/components/shared/ErrorState";
import { TrendsForm } from "@/components/trends/TrendsForm";
import { KeywordSignalCard } from "@/components/trends/KeywordSignalCard";
import type { KeywordSignal, TrendsResult } from "@/lib/trends/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; signals: KeywordSignal[] };

export function TrendsClient() {
  const { demoMode } = useDemoMode();
  const [state, setState] = useState<State>({ status: "idle" });
  const [lastKeywords, setLastKeywords] = useState<string[] | null>(null);

  const runCompare = useCallback(
    async (keywords: string[]) => {
      setState({ status: "loading" });
      setLastKeywords(keywords);
      try {
        const res = await fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords, demo: demoMode }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          setState({
            status: "error",
            message: err?.error ?? `Comparison failed (${res.status}).`,
          });
          return;
        }
        const result = (await res.json()) as TrendsResult;
        setState({ status: "ok", signals: result.signals });
      } catch {
        setState({
          status: "error",
          message: "Network error — check your connection and try again.",
        });
      }
    },
    [demoMode],
  );

  return (
    <div className="space-y-6">
      <TrendsForm onCompare={runCompare} loading={state.status === "loading"} />

      {state.status === "error" && (
        <ErrorState
          title="Comparison failed"
          body={state.message}
          retry={lastKeywords ? () => runCompare(lastKeywords) : undefined}
        />
      )}

      {state.status === "ok" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.signals.map((s) => (
            <KeywordSignalCard key={s.keyword} signal={s} />
          ))}
        </div>
      )}
    </div>
  );
}
