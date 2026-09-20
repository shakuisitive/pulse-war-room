import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isAuthRoute,
  isMfaAllowedRoute,
  isOnboardingRoute,
  isPublicRoute,
  isStakeholderAllowedRoute,
} from "@/lib/auth/routes";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/supabase";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (isPublicRoute(pathname)) {
    if (user && isAuthRoute(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, is_stakeholder_only")
    .eq("id", user.id)
    .maybeSingle();

  const hasProfile = Boolean(profile);

  if (
    !hasProfile &&
    !isOnboardingRoute(pathname) &&
    !pathname.startsWith("/mfa/")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/onboarding/create-org";
    return NextResponse.redirect(redirectUrl);
  }

  if (hasProfile && isOnboardingRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = profile?.is_stakeholder_only
      ? "/profile"
      : "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  if (profile?.is_stakeholder_only && !isStakeholderAllowedRoute(pathname)) {
    const { data: assignment } = await supabase
      .from("incident_participants")
      .select("incident_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("incident_role", "stakeholder")
      .limit(1)
      .maybeSingle();

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = assignment?.incident_id
      ? `/incidents/${assignment.incident_id}`
      : "/profile";
    return NextResponse.redirect(redirectUrl);
  }

  if (
    profile &&
    !profile.is_stakeholder_only &&
    !isMfaAllowedRoute(pathname)
  ) {
    const { data: organization } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", profile.org_id)
      .maybeSingle();

    const settings = organization?.settings as { requireMfa?: boolean } | null;
    if (settings?.requireMfa) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = (factors?.totp ?? []).some(
        (factor) => factor.status === "verified",
      );

      if (!hasVerifiedTotp) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/profile";
        redirectUrl.searchParams.set("mfa", "required");
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}
