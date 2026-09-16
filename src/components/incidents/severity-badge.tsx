import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/supabase";

type Severity = Database["public"]["Enums"]["severity_level"];

const severityConfig: Record<
  Severity,
  { label: string; className: string }
> = {
  sev1: { label: "SEV1", className: "bg-sev1-bg text-sev1 border-sev1/30" },
  sev2: { label: "SEV2", className: "bg-sev2-bg text-sev2 border-sev2/30" },
  sev3: { label: "SEV3", className: "bg-sev3-bg text-sev3 border-sev3/30" },
  sev4: { label: "SEV4", className: "bg-sev4-bg text-sev4 border-sev4/30" },
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const config = severityConfig[severity];

  return (
    <Badge
      variant="outline"
      className={cn("font-mono uppercase", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
