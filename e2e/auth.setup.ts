import fs from "node:fs";
import path from "node:path";

import { test as setup, expect } from "@playwright/test";

import { markTested } from "./module-coverage";
import type { E2ECredentials } from "./global-setup";

const AUTH_DIR = path.resolve(process.cwd(), "e2e/.auth");
const OWNER_STATE = path.join(AUTH_DIR, "owner.json");

setup("authenticate owner", async ({ page }) => {
  const credentials = JSON.parse(
    fs.readFileSync(path.join(AUTH_DIR, "credentials.json"), "utf8"),
  ) as E2ECredentials;

  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(credentials.email);
  await page.getByRole("textbox", { name: "Password" }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: new RegExp(`Welcome back, ${credentials.displayName}`, "i") }),
  ).toBeVisible();

  markTested("auth-login");
  await page.context().storageState({ path: OWNER_STATE });
});
