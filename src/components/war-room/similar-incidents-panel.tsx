"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type SimilarIncident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  similarity: number;
};

export function SimilarIncidentsPanel({ incidentId }: { incidentId: string }) {
  const [items, setItems] = useState<SimilarIncident[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void supabase
      .rpc("get_similar_incidents", { p_incident_id: incidentId, p_limit: 5 })
      .then(({ data, error: rpcError }) => {
        if (cancelled) {
          return;
        }
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        setItems((data as SimilarIncident[]) ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Similar past incidents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No similar resolved incidents yet. Embeddings generate after incidents are created.
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/incidents/${item.id}`}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-accent/40"
            >
              <span className="font-medium">{item.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{item.severity.toUpperCase()}</Badge>
                <span className="text-xs text-muted-foreground">
                  {Math.round(item.similarity * 100)}%
                </span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
