import { jsonResponse } from "../_shared/cors.ts";
import { openAiEmbedding, hasOpenAiKey } from "../_shared/openai.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!authHeader.includes(serviceKey)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createServiceClient();

  const { data: notificationCount, error: notificationError } = await supabase.rpc(
    "process_notification_jobs",
    { p_batch_size: 50 },
  );

  if (notificationError) {
    return jsonResponse({ error: notificationError.message }, 500);
  }

  let embeddingsProcessed = 0;
  let embeddingJobsClaimed = 0;
  const openAiConfigured = hasOpenAiKey();

  if (openAiConfigured) {
    const { data: jobs, error: jobsError } = await supabase.rpc(
      "claim_embedding_jobs",
      { p_batch_size: 10 },
    );

    if (jobsError) {
      return jsonResponse({ error: jobsError.message }, 500);
    }

    embeddingJobsClaimed = jobs?.length ?? 0;

    for (const job of jobs ?? []) {
      const { data: incident, error: incidentError } = await supabase
        .from("incidents")
        .select("id, title, description")
        .eq("id", job.incident_id)
        .maybeSingle();

      if (incidentError || !incident) {
        await supabase.rpc("complete_embedding_job", { p_msg_id: job.msg_id });
        continue;
      }

      try {
        const text = `${incident.title}\n${incident.description ?? ""}`.trim();
        const embedding = await openAiEmbedding(text);

        await supabase
          .from("incidents")
          .update({ embedding })
          .eq("id", incident.id);

        embeddingsProcessed += 1;
      } catch {
        // Leave job for retry until visibility timeout expires
      } finally {
        await supabase.rpc("complete_embedding_job", { p_msg_id: job.msg_id });
      }
    }
  }

  return jsonResponse({
    notificationsProcessed: notificationCount ?? 0,
    embeddingsProcessed,
    openAiConfigured,
    embeddingJobsClaimed,
  });
});
