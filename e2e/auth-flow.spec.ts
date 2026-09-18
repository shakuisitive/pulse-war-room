import fs from "node:fs";
import path from "node:path";

import { test, expect } from "@playwright/test";

import { createE2EAdminClient } from "./helpers/supabase-admin";
import { loadEnvFile } from "./helpers/load-env";
import { markTested } from "./module-coverage";

test.describe("auth flows", () => {
  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByText("Reset your password")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    markTested("public-forgot-password");
  });

  test("signup submits and redirects to login confirmation", async ({
    page,
  }) => {
    loadEnvFile();
    const email = `e2e-signup-${Date.now()}@pulse.dev`;
    const password = "E2eSignupPassword123!";

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    const loginRedirect = page.waitForURL(/\/login\?message=/, { timeout: 30_000 });
    const rateLimitError = page.getByText(/rate limit/i);
    await Promise.race([
      loginRedirect,
      rateLimitError.waitFor({ state: "visible", timeout: 30_000 }),
    ]);

    if (page.url().includes("/login")) {
      await expect(page.getByText(/check your email/i)).toBeVisible();
      markTested("auth-signup-submit");
    } else {
      await expect(rateLimitError).toBeVisible();
      markTested("auth-signup-submit", "partial");
    }

    const admin = createE2EAdminClient();
    const { data } = await admin.auth.admin.listUsers();
    const created = data.users.find((user) => user.email === email);
    if (created) {
      await admin.auth.admin.deleteUser(created.id);
    }
  });

  test("onboarding creates organization for new user", async ({ page }) => {
    loadEnvFile();
    const stamp = Date.now();
    const email = `e2e-onboard-${stamp}@pulse.dev`;
    const password = "E2eOnboardPassword123!";
    const orgSlug = `e2e-onboard-${stamp}`;

    const admin = createE2EAdminClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !created.user) {
      throw new Error(error?.message ?? "Failed to create onboarding user");
    }

    try {
      await page.goto("/login");
      await page.getByRole("textbox", { name: "Email" }).fill(email);
      await page.getByRole("textbox", { name: "Password" }).fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page).toHaveURL(/\/onboarding\/create-org/, {
        timeout: 30_000,
      });
      await expect(page.getByText("Create your organization")).toBeVisible();

      await page.getByLabel("Organization name").fill("Onboarding E2E Org");
      await page.getByLabel("URL slug").fill(orgSlug);
      await page.getByLabel("Your display name").fill("Onboarding Tester");
      await page.getByRole("button", { name: "Create organization" }).click();

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
      await expect(
        page.getByRole("heading", {
          name: /Welcome back, Onboarding Tester/i,
        }),
      ).toBeVisible();
      markTested("auth-onboarding-create-org");
    } finally {
      await admin.auth.admin.deleteUser(created.user.id);
    }
  });
});
