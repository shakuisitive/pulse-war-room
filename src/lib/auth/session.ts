import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export type SessionContext = {
  userId: string;
  email: string;
  profile: Profile;
  organization: Organization;
};

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  if (orgError || !organization) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    profile,
    organization,
  };
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function isOrgAdmin(orgRole: Profile["org_role"]) {
  return orgRole === "owner" || orgRole === "admin";
}
