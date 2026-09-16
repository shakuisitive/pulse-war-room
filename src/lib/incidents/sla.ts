import type { Database } from "@/types/supabase";
import type { DefaultOrgSettings } from "@/schemas/organization";

type Severity = Database["public"]["Enums"]["severity_level"];
type IncidentStatus = Database["public"]["Enums"]["incident_status"];

export type SlaState = "ok" | "warning" | "breach";

export function getSlaState({
  severity,
  status,
  declaredAt,
  acknowledgedAt,
  resolvedAt,
  slaThresholds,
  now = new Date(),
}: {
  severity: Severity;
  status: IncidentStatus;
  declaredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  slaThresholds: DefaultOrgSettings["slaThresholds"];
  now?: Date;
}): SlaState {
  const thresholds = slaThresholds[severity];
  const declared = new Date(declaredAt).getTime();
  const elapsedMinutes = (now.getTime() - declared) / 60_000;

  if (status === "resolved" && resolvedAt) {
    const resolveMinutes =
      (new Date(resolvedAt).getTime() - declared) / 60_000;
    if (resolveMinutes > thresholds.resolveMinutes) {
      return "breach";
    }
    if (resolveMinutes > thresholds.resolveMinutes * 0.8) {
      return "warning";
    }
    return "ok";
  }

  if (status === "declared" && !acknowledgedAt) {
    if (elapsedMinutes > thresholds.acknowledgeMinutes) {
      return "breach";
    }
    if (elapsedMinutes > thresholds.acknowledgeMinutes * 0.8) {
      return "warning";
    }
    return "ok";
  }

  if (elapsedMinutes > thresholds.resolveMinutes) {
    return "breach";
  }
  if (elapsedMinutes > thresholds.resolveMinutes * 0.8) {
    return "warning";
  }

  return "ok";
}

export function formatDuration(startIso: string, endIso?: string | null) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
