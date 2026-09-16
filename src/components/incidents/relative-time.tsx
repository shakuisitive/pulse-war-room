"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

export function RelativeTime({
  dateIso,
  addSuffix = false,
}: {
  dateIso: string;
  addSuffix?: boolean;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setLabel(formatDistanceToNow(new Date(dateIso), { addSuffix }));
    };

    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [dateIso, addSuffix]);

  return <>{label ?? "…"}</>;
}
