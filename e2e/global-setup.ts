import fs from "node:fs";
import path from "node:path";

import {
  createE2EAdminClient,
  createE2EUserClient,
  defaultOrgSettings,
  seedEscalationPolicies,
} from "./helpers/supabase-admin";
import { loadEnvFile } from "./helpers/load-env";
import { resetCoverageState } from "./module-coverage";

const AUTH_DIR = path.resolve(process.cwd(), "e2e/.auth");
const CREDENTIALS_PATH = path.join(AUTH_DIR, "credentials.json");

export interface E2ECredentials {
  email: string;
  password: string;
  userId: string;
  orgId: string;
  orgSlug: string;
  displayName: string;
}

async function globalSetup() {
  loadEnvFile();
  resetCoverageState();

  const stamp = Date.now();
  const email = `e2e-owner-${stamp}@pulse.dev`;
  const password = "E2eTestPassword123!";
  const orgSlug = `e2e-org-${stamp}`;
  const displayName = "E2E Owner";

  const admin = createE2EAdminClient();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

  if (createError || !created.user) {
    throw new Error(
      `Failed to create E2E user: ${createError?.message ?? "unknown error"}`,
    );
  }

  const userClient = createE2EUserClient();
  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in E2E user: ${signInError.message}`);
  }

  const { data: orgId, error: orgError } = await userClient.rpc(
    "create_organization_with_owner",
    {
      org_name: "E2E Test Organization",
      org_slug: orgSlug,
      owner_display_name: displayName,
    },
  );

  if (orgError || !orgId) {
    throw new Error(
      `Failed to create E2E organization: ${orgError?.message ?? "unknown error"}`,
    );
  }

  const { error: settingsError } = await userClient
    .from("organizations")
    .update({ settings: defaultOrgSettings })
    .eq("id", orgId);

  if (settingsError) {
    throw new Error(
      `Failed to update org settings: ${settingsError.message}`,
    );
  }

  await seedEscalationPolicies(orgId);

  const credentials: E2ECredentials = {
    email,
    password,
    userId: created.user.id,
    orgId,
    orgSlug,
    displayName,
  };

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));

  console.log(`E2E test user ready: ${email}`);
}

export default globalSetup;
