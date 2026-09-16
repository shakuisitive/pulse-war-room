"use client";

import { useEffect, useState } from "react";

import { formatDuration } from "@/lib/incidents/sla";

export function IncidentDuration({
  declaredAt,
  resolvedAt,
}: {
  declaredAt: string;
  resolvedAt: string | null;
}) {
  const [label, setLabel] = useState<string | null>(() =>
    resolvedAt ? formatDuration(declaredAt, resolvedAt) : null,
  );

  useEffect(() => {
    if (resolvedAt) {
      setLabel(formatDuration(declaredAt, resolvedAt));
      return;
    }

    const update = () => setLabel(formatDuration(declaredAt, null));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [declaredAt, resolvedAt]);

  return (
    <span className="font-mono">
      Open for {label ?? "…"}
    </span>
  );
}
