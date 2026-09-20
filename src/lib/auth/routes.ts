export const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/mfa/verify",
] as const;

export const authRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

export const onboardingRoutes = ["/onboarding/create-org"] as const;

export function isPublicRoute(pathname: string) {
  return (
    publicRoutes.includes(pathname as (typeof publicRoutes)[number]) ||
    pathname.startsWith("/auth/")
  );
}

export function isAuthRoute(pathname: string) {
  return authRoutes.includes(pathname as (typeof authRoutes)[number]);
}

export function isOnboardingRoute(pathname: string) {
  return onboardingRoutes.includes(
    pathname as (typeof onboardingRoutes)[number],
  );
}

export function isMfaAllowedRoute(pathname: string) {
  return pathname === "/profile" || pathname.startsWith("/mfa/");
}

export function isStakeholderAllowedRoute(pathname: string) {
  return (
    pathname.startsWith("/incidents/") ||
    pathname === "/profile" ||
    pathname.startsWith("/mfa/")
  );
}
