import { getSupabaseUrl } from "@/lib/env";

export function getWebhookUrl(endpointSlug: string) {
  return `${getSupabaseUrl()}/functions/v1/webhook-ingest/${endpointSlug}`;
}
