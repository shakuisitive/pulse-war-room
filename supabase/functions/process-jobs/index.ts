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

  const { emailsProcessed, emailsSkipped } = await processEmailJobs(supabase);

  return jsonResponse({
    notificationsProcessed: notificationCount ?? 0,
    embeddingsProcessed,
    openAiConfigured,
    embeddingJobsClaimed,
    emailsProcessed,
    emailsSkipped,
  });
});

async function processEmailJobs(
  supabase: ReturnType<typeof createServiceClient>,
) {
  const { data: jobs, error } = await supabase.rpc("claim_email_jobs", {
    p_batch_size: 25,
  });

  if (error || !jobs) {
    return { emailsProcessed: 0, emailsSkipped: 0 };
  }

  let emailsProcessed = 0;
  let emailsSkipped = 0;

  for (const job of jobs) {
    const payload = job.payload as {
      user_id?: string;
      title?: string;
      body?: string;
    };

    try {
      const { data } = await supabase.auth.admin.getUserById(payload.user_id ?? "");
      const email = data.user?.email;

      if (!email) {
        emailsSkipped += 1;
      } else {
        const sent = await sendNotificationEmail(
          email,
          payload.title ?? "Pulse notification",
          payload.body ?? "",
        );
        if (sent) {
          emailsProcessed += 1;
        } else {
          emailsSkipped += 1;
        }
      }
    } catch {
      emailsSkipped += 1;
    } finally {
      await supabase.rpc("complete_email_job", { p_msg_id: job.msg_id });
    }
  }

  return { emailsProcessed, emailsSkipped };
}

async function sendNotificationEmail(to: string, subject: string, body: string) {
  const hostname = Deno.env.get("SMTP_HOSTNAME");
  const username = Deno.env.get("SMTP_USERNAME");
  const password = Deno.env.get("SMTP_PASSWORD");
  const from = Deno.env.get("SMTP_FROM") ?? username;
  const port = Number(Deno.env.get("SMTP_PORT") ?? "587");

  if (!hostname || !username || !password || !from) {
    return false;
  }

  const conn = await Deno.connectTls({ hostname, port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function read() {
    const buffer = new Uint8Array(1024);
    const bytes = await conn.read(buffer);
    return decoder.decode(buffer.subarray(0, bytes ?? 0));
  }

  async function write(command: string) {
    await conn.write(encoder.encode(`${command}\r\n`));
    return read();
  }

  try {
    await read();
    await write(`EHLO pulse`);
    await write(`AUTH LOGIN`);
    await write(btoa(username));
    await write(btoa(password));
    await write(`MAIL FROM:<${from}>`);
    await write(`RCPT TO:<${to}>`);
    await write(`DATA`);
    await write(
      `From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\n\r\n${body}\r\n.`,
    );
    await write(`QUIT`);
    return true;
  } catch {
    return false;
  } finally {
    try {
      conn.close();
    } catch {
      // ignore
    }
  }
}
