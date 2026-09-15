import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

/**
 * Service-role client for trusted server-side operations that bypass RLS.
 * Never import this module in client code.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
