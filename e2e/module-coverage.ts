import fs from "node:fs";
import path from "node:path";

export type CoverageStatus =
  | "tested"
  | "partial"
  | "skipped"
  | "not_testable_e2e";

export interface ModuleCheck {
  id: string;
  milestone: "Public" | "Auth" | "M1" | "M2" | "M3" | "M4";
  module: string;
  feature: string;
  status: CoverageStatus;
  note?: string;
}

export const MODULE_CHECKS: ModuleCheck[] = [
  // Public
  {
    id: "public-landing",
    milestone: "Public",
    module: "Landing",
    feature: "Hero, features, sign-in CTA",
    status: "skipped",
  },
  {
    id: "public-login-form",
    milestone: "Public",
    module: "Auth",
    feature: "Login page renders",
    status: "skipped",
  },
  {
    id: "public-signup-form",
    milestone: "Public",
    module: "Auth",
    feature: "Signup page renders",
    status: "skipped",
  },
  {
    id: "public-forgot-password",
    milestone: "Public",
    module: "Auth",
    feature: "Forgot password page",
    status: "skipped",
  },

  // Auth flows
  {
    id: "auth-signup-submit",
    milestone: "Auth",
    module: "Auth",
    feature: "Signup form submission (email confirm redirect)",
    status: "skipped",
  },
  {
    id: "auth-login",
    milestone: "Auth",
    module: "Auth",
    feature: "Login with email/password",
    status: "skipped",
  },
  {
    id: "auth-onboarding-create-org",
    milestone: "M1",
    module: "Onboarding",
    feature: "Create organization after signup",
    status: "skipped",
  },
  {
    id: "auth-magic-link",
    milestone: "Auth",
    module: "Auth",
    feature: "Magic link login",
    status: "not_testable_e2e",
    note: "Requires email inbox",
  },
  {
    id: "auth-oauth",
    milestone: "Auth",
    module: "Auth",
    feature: "OAuth (Google/GitHub)",
    status: "not_testable_e2e",
    note: "External OAuth provider",
  },
  {
    id: "auth-mfa",
    milestone: "M1",
    module: "Profile",
    feature: "MFA enrollment UI",
    status: "skipped",
    note: "UI only; TOTP verify needs authenticator",
  },

  // M1 — Dashboard & org
  {
    id: "m1-dashboard",
    milestone: "M1",
    module: "Dashboard",
    feature: "Dashboard loads with stats and incident list",
    status: "skipped",
  },
  {
    id: "m1-org-presence",
    milestone: "M1",
    module: "Dashboard",
    feature: "Org presence indicator",
    status: "skipped",
  },
  {
    id: "m1-profile",
    milestone: "M1",
    module: "Profile",
    feature: "Update display name and notification prefs",
    status: "skipped",
  },
  {
    id: "m1-settings",
    milestone: "M1",
    module: "Settings",
    feature: "Org settings (name, SLA, MFA toggle)",
    status: "skipped",
  },
  {
    id: "m1-team-invite",
    milestone: "M1",
    module: "Team",
    feature: "Member invite form (admin)",
    status: "skipped",
    note: "Invite sent; acceptance needs email",
  },
  {
    id: "m1-team-list",
    milestone: "M1",
    module: "Team",
    feature: "Member list visible",
    status: "skipped",
  },

  // M2 — Incidents & war room
  {
    id: "m2-declare-incident",
    milestone: "M2",
    module: "Dashboard",
    feature: "Declare incident → war room redirect",
    status: "skipped",
  },
  {
    id: "m2-war-room-header",
    milestone: "M2",
    module: "War room",
    feature: "Incident header (severity, status, SLA)",
    status: "skipped",
  },
  {
    id: "m2-status-transitions",
    milestone: "M2",
    module: "War room",
    feature: "Status lifecycle transitions",
    status: "skipped",
  },
  {
    id: "m2-chat",
    milestone: "M2",
    module: "War room",
    feature: "War room chat send message",
    status: "skipped",
  },
  {
    id: "m2-tasks",
    milestone: "M2",
    module: "War room",
    feature: "Create and complete task",
    status: "skipped",
  },
  {
    id: "m2-timeline",
    milestone: "M2",
    module: "War room",
    feature: "Timeline panel visible",
    status: "skipped",
  },
  {
    id: "m2-participants",
    milestone: "M2",
    module: "War room",
    feature: "Participants panel",
    status: "skipped",
  },
  {
    id: "m2-presence",
    milestone: "M2",
    module: "War room",
    feature: "War room presence panel",
    status: "skipped",
  },
  {
    id: "m2-evidence-ui",
    milestone: "M2",
    module: "War room",
    feature: "Evidence upload UI",
    status: "skipped",
    note: "File upload input present; upload not exercised",
  },
  {
    id: "m2-on-call",
    milestone: "M2",
    module: "On-call",
    feature: "On-call rotation CRUD (admin)",
    status: "skipped",
  },
  {
    id: "m2-search-keyword",
    milestone: "M2",
    module: "Dashboard",
    feature: "Keyword incident search",
    status: "skipped",
  },

  // M3 — AI, integrations, analytics
  {
    id: "m3-search-semantic",
    milestone: "M3",
    module: "Dashboard",
    feature: "Semantic search toggle",
    status: "skipped",
  },
  {
    id: "m3-ai-catch-up",
    milestone: "M3",
    module: "War room",
    feature: "AI Catch me up panel",
    status: "skipped",
    note: "May depend on OpenAI Edge Function",
  },
  {
    id: "m3-ai-suggest-severity",
    milestone: "M3",
    module: "War room",
    feature: "AI Suggest severity",
    status: "partial",
    note: "UI exercised; OpenAI response optional",
  },
  {
    id: "m3-similar-incidents",
    milestone: "M3",
    module: "War room",
    feature: "Similar past incidents panel",
    status: "skipped",
  },
  {
    id: "m3-integrations",
    milestone: "M3",
    module: "Integrations",
    feature: "Create integration",
    status: "skipped",
  },
  {
    id: "m3-escalation",
    milestone: "M3",
    module: "Escalation",
    feature: "Edit escalation policy thresholds",
    status: "skipped",
  },
  {
    id: "m3-analytics",
    milestone: "M3",
    module: "Analytics",
    feature: "Load analytics dashboard",
    status: "skipped",
  },
  {
    id: "m3-notifications",
    milestone: "M3",
    module: "Notifications",
    feature: "Notification center opens",
    status: "skipped",
  },
  {
    id: "m3-stakeholder-invite",
    milestone: "M3",
    module: "War room",
    feature: "Stakeholder invite + sanitized view",
    status: "not_testable_e2e",
    note: "Requires second confirmed user session",
  },
  {
    id: "m3-webhook-ingest",
    milestone: "M3",
    module: "Integrations",
    feature: "Webhook ingest creates incident",
    status: "not_testable_e2e",
    note: "Edge Function + deployed secrets; covered in unit/smoke",
  },

  // M4 — Post-mortems, audit, action items
  {
    id: "m4-resolve-incident",
    milestone: "M4",
    module: "War room",
    feature: "Resolve incident",
    status: "skipped",
  },
  {
    id: "m4-post-mortem-editor",
    milestone: "M4",
    module: "Post-mortem",
    feature: "Edit and save post-mortem draft",
    status: "skipped",
  },
  {
    id: "m4-action-items",
    milestone: "M4",
    module: "Post-mortem",
    feature: "Add action item on post-mortem",
    status: "skipped",
  },
  {
    id: "m4-publish-post-mortem",
    milestone: "M4",
    module: "Post-mortem",
    feature: "Publish post-mortem",
    status: "skipped",
  },
  {
    id: "m4-post-mortem-archive",
    milestone: "M4",
    module: "Post-mortems",
    feature: "Published post-mortem in archive",
    status: "skipped",
  },
  {
    id: "m4-dashboard-action-items",
    milestone: "M4",
    module: "Dashboard",
    feature: "My action items widget",
    status: "skipped",
  },
  {
    id: "m4-audit-log",
    milestone: "M4",
    module: "Audit log",
    feature: "Load audit log (admin)",
    status: "skipped",
  },
  {
    id: "m4-ai-draft-post-mortem",
    milestone: "M4",
    module: "Post-mortem",
    feature: "Generate AI post-mortem draft",
    status: "partial",
    note: "UI exercised; OpenAI response optional",
  },
];

const COVERAGE_STATE_PATH = path.resolve(
  process.cwd(),
  "e2e/.auth/coverage-state.json",
);

function loadCoverageState(): Record<string, CoverageStatus> {
  if (!fs.existsSync(COVERAGE_STATE_PATH)) {
    return {};
  }

  return JSON.parse(
    fs.readFileSync(COVERAGE_STATE_PATH, "utf8"),
  ) as Record<string, CoverageStatus>;
}

function saveCoverageState(state: Record<string, CoverageStatus>) {
  fs.mkdirSync(path.dirname(COVERAGE_STATE_PATH), { recursive: true });
  fs.writeFileSync(COVERAGE_STATE_PATH, JSON.stringify(state, null, 2));
}

export function resetCoverageState() {
  if (fs.existsSync(COVERAGE_STATE_PATH)) {
    fs.unlinkSync(COVERAGE_STATE_PATH);
  }
}

export function markTested(id: string, status: CoverageStatus = "tested") {
  const state = loadCoverageState();
  state[id] = status;
  saveCoverageState(state);
}

export function getCoverageResults(): ModuleCheck[] {
  const state = loadCoverageState();
  return MODULE_CHECKS.map((check) => ({
    ...check,
    status: state[check.id] ?? check.status,
  }));
}

export function writeCoverageReport(outputPath = "e2e/coverage-report.json") {
  const results = getCoverageResults();
  const summary = {
    total: results.length,
    tested: results.filter((r) => r.status === "tested").length,
    partial: results.filter((r) => r.status === "partial").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    notTestableE2e: results.filter((r) => r.status === "not_testable_e2e")
      .length,
    e2eCoverable: results.filter((r) => r.status !== "not_testable_e2e")
      .length,
    e2eCoverableTested: results.filter(
      (r) => r.status === "tested" || r.status === "partial",
    ).length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    modules: results,
  };

  const absolutePath = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(report, null, 2));

  return report;
}

export function formatCoverageSummary(report: ReturnType<typeof writeCoverageReport>) {
  const { summary } = report;
  const pct =
    summary.e2eCoverable === 0
      ? 0
      : Math.round((summary.e2eCoverableTested / summary.e2eCoverable) * 100);

  const lines = [
    "",
    "=== Pulse E2E Module Coverage ===",
    `E2E-testable features: ${summary.e2eCoverableTested}/${summary.e2eCoverable} (${pct}%)`,
    `  tested: ${summary.tested}`,
    `  partial: ${summary.partial}`,
    `  skipped (not run): ${summary.skipped}`,
    `  not testable via E2E: ${summary.notTestableE2e}`,
    "",
    "Not covered in E2E (by design or infra):",
  ];

  for (const item of report.modules.filter(
    (m) => m.status === "not_testable_e2e" || m.status === "skipped",
  )) {
    lines.push(`  [${item.status}] ${item.module} — ${item.feature}${item.note ? ` (${item.note})` : ""}`);
  }

  lines.push("");
  return lines.join("\n");
}
