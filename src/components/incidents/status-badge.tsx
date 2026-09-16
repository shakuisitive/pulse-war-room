import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/supabase";

type IncidentStatus = Database["public"]["Enums"]["incident_status"];

const statusConfig: Record<
  IncidentStatus,
  { label: string; className: string }
> = {
  declared: {
    label: "Declared",
    className: "border-[color:var(--status-declared)] text-[color:var(--status-declared)]",
  },
  investigating: {
    label: "Investigating",
    className:
      "border-[color:var(--status-investigating)] text-[color:var(--status-investigating)]",
  },
  identified: {
    label: "Identified",
    className:
      "border-[color:var(--status-identified)] text-[color:var(--status-identified)]",
  },
  monitoring: {
    label: "Monitoring",
    className:
      "border-[color:var(--status-monitoring)] text-[color:var(--status-monitoring)]",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-[color:var(--status-resolved)] text-[color:var(--status-resolved)]",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: IncidentStatus;
  className?: string;
}) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn("capitalize", config.className, className)}>
      {config.label}
    </Badge>
  );
}
