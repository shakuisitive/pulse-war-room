"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { semanticSearchAction } from "@/app/actions/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type SearchResult = {
  id: string;
  title: string;
  severity: string;
  status: string;
  similarity?: number;
};

export function IncidentSearch() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"keyword" | "semantic">("keyword");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSearch() {
    if (!query.trim()) {
      return;
    }

    setError(null);
    startTransition(async () => {
      if (mode === "semantic") {
        const response = await semanticSearchAction(query.trim());
        if (response.error) {
          setError(response.error);
          setResults([]);
          return;
        }
        setResults(response.results ?? []);
        return;
      }

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "search_incidents_keyword",
        { p_query: query.trim(), p_limit: 20 },
      );

      if (rpcError) {
        setError(rpcError.message);
        setResults([]);
        return;
      }

      const rows = (data ?? []) as Array<{
        id: string;
        title: string;
        severity: string;
        status: string;
      }>;

      setResults(
        rows.map((item) => ({
          id: item.id,
          title: item.title,
          severity: item.severity,
          status: item.status,
        })),
      );
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">Search incidents</h2>
        <p className="text-sm text-muted-foreground">
          Keyword search uses Postgres full-text search. Semantic search uses embeddings via AI.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="space-y-2">
          <Label htmlFor="incident-search">Query</Label>
          <Input
            id="incident-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="database latency, checkout outage…"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant={mode === "keyword" ? "default" : "outline"}
            onClick={() => setMode("keyword")}
          >
            Keyword
          </Button>
          <Button
            type="button"
            variant={mode === "semantic" ? "default" : "outline"}
            onClick={() => setMode("semantic")}
          >
            Semantic
          </Button>
        </div>
        <div className="flex items-end">
          <Button disabled={isPending} onClick={runSearch}>
            {isPending ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/incidents/${result.id}`}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-accent/40"
            >
              <span>{result.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{result.severity.toUpperCase()}</Badge>
                {typeof result.similarity === "number" ? (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(result.similarity * 100)}%
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
