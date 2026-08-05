"use client";

import { useCallback, useState } from "react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";
import { ErrorState } from "@/components/shared/ErrorState";
import { ScoutForm } from "@/components/scout/ScoutForm";
import { ScoutResults } from "@/components/scout/ScoutResults";
import { FilterPipeline } from "@/components/scout/FilterPipeline";
import type { ScoutQuery, ScoutResult } from "@/lib/scout/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; result: ScoutResult };

export function ScoutClient() {
  const { demoMode } = useDemoMode();
  const [state, setState] = useState<State>({ status: "idle" });
  const [lastQuery, setLastQuery] = useState<ScoutQuery | null>(null);

  const runSearch = useCallback(
    async (query: ScoutQuery) => {
      setState({ status: "loading" });
      setLastQuery(query);
      try {
        const res = await fetch("/api/scout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...query, demo: demoMode }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setState({
            status: "error",
            message: err?.error ?? `Search failed (${res.status}).`,
          });
          return;
        }
        const result = (await res.json()) as ScoutResult;
        setState({ status: "ok", result });
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
      <ScoutForm onSearch={runSearch} loading={state.status === "loading"} />

      {state.status === "error" && (
        <ErrorState
          title="Search failed"
          body={state.message}
          retry={lastQuery ? () => runSearch(lastQuery) : undefined}
        />
      )}

      {state.status === "ok" && (
        <>
          <FilterPipeline
            pipeline={state.result.pipeline}
            totalMatched={state.result.totalMatched}
          />
          <ScoutResults result={state.result} sort={lastQuery?.sort} />
        </>
      )}
    </div>
  );
}
