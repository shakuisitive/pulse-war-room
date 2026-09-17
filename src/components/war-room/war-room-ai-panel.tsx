"use client";

import { useState, useTransition } from "react";

import { runAiIncidentAction } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WarRoomAiPanel({ incidentId }: { incidentId: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: "summarize" | "suggest-severity" | "post-mortem-draft") {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const response = await runAiIncidentAction(incidentId, action);
      if (response.error) {
        setError(response.error);
        return;
      }
      setResult(response.result ?? "No content returned.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI assistance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => runAction("summarize")}
          >
            Catch me up
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => runAction("suggest-severity")}
          >
            Suggest severity
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => runAction("post-mortem-draft")}
          >
            Draft post-mortem
          </Button>
        </div>
        {isPending ? <p className="text-sm text-muted-foreground">Generating…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {result ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
            {result}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
