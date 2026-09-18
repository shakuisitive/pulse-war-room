import fs from "node:fs";
import path from "node:path";

import { createE2EAdminClient } from "./helpers/supabase-admin";
import { loadEnvFile } from "./helpers/load-env";
import type { E2ECredentials } from "./global-setup";
import {
  formatCoverageSummary,
  writeCoverageReport,
} from "./module-coverage";

async function globalTeardown() {
  loadEnvFile();

  const credentialsPath = path.resolve(
    process.cwd(),
    "e2e/.auth/credentials.json",
  );

  if (fs.existsSync(credentialsPath)) {
    const credentials = JSON.parse(
      fs.readFileSync(credentialsPath, "utf8"),
    ) as E2ECredentials;

    const admin = createE2EAdminClient();
    const { error } = await admin.auth.admin.deleteUser(credentials.userId);

    if (error) {
      console.warn(`E2E teardown: could not delete user — ${error.message}`);
    } else {
      console.log(`E2E teardown: deleted test user ${credentials.email}`);
    }
  }

  const report = writeCoverageReport();
  console.log(formatCoverageSummary(report));
}

export default globalTeardown;
