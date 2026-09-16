import type { Database } from "@/types/supabase";

type IncidentStatus = Database["public"]["Enums"]["incident_status"];

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  declared: ["investigating", "resolved"],
  investigating: ["identified", "monitoring", "resolved"],
  identified: ["monitoring", "resolved"],
  monitoring: ["resolved"],
  resolved: [],
};

export function isValidStatusTransition(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  if (from === to) {
    return true;
  }

  if (from === "resolved") {
    return false;
  }

  return VALID_TRANSITIONS[from].includes(to);
}

export function getNextStatuses(
  current: IncidentStatus,
): IncidentStatus[] {
  return VALID_TRANSITIONS[current];
}
