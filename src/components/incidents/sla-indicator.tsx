import { cn } from "@/lib/utils";
import type { SlaState } from "@/lib/incidents/sla";

const slaConfig: Record<SlaState, { label: string; className: string }> = {
  ok: {
    label: "SLA OK",
    className: "bg-success-bg text-success border-success/30",
  },
  warning: {
    label: "SLA Warning",
    className: "bg-warning-bg text-warning border-warning/30",
  },
  breach: {
    label: "SLA Breach",
    className: "bg-destructive-bg text-destructive border-destructive/30",
  },
};

export function SlaIndicator({
  state,
  className,
}: {
  state: SlaState;
  className?: string;
}) {
  const config = slaConfig[state];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
