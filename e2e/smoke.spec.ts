import { test, expect } from "@playwright/test";

import { markTested } from "./module-coverage";

test.describe("public routes", () => {
  test("landing page renders hero and sign in link", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Coordinate faster when production breaks/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    markTested("public-landing");
  });

  test("login page renders sign-in form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Sign in to Pulse")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
    markTested("public-login-form");
  });

  test("signup page renders registration form", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    markTested("public-signup-form");
  });
});
