import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/supabase";

/**
 * Service-role client for trusted server-side operations that bypass RLS.
 * Never import this module in client code.
 */
export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
