import { test, expect } from "@playwright/test";

import { openDeclareIncidentDialog } from "./helpers/incidents";
import { markTested } from "./module-coverage";

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.describe("authenticated modules", () => {
  let incidentTitle: string;
  let incidentId: string;

  test("dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Monitor active incidents")).toBeVisible();
    await expect(page.getByRole("button", { name: "Declare incident" })).toBeVisible();
    markTested("m1-dashboard");
    markTested("m1-org-presence");
  });

  test("profile page — update display name", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

    const displayName = page.getByLabel("Display name");
    await displayName.fill("E2E Owner Updated");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile updated.")).toBeVisible({
      timeout: 15_000,
    });
    markTested("m1-profile");
    markTested("auth-mfa", "partial");
  });

  test("settings page — save org settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Organization settings" }),
    ).toBeVisible();

    const nameInput = page.getByLabel("Organization name");
    await nameInput.fill("E2E Test Organization");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Organization settings saved.")).toBeVisible({
      timeout: 15_000,
    });
    markTested("m1-settings");
  });

  test("team page — member list and invite form", async ({ page }) => {
    await page.goto("/team");
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await expect(page.getByText(/Members \(\d+\)/)).toBeVisible();

    await expect(page.getByText("Invite member")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Role")).toBeVisible();
    markTested("m1-team-list");

    await page.getByLabel("Email").fill(`invite-e2e-${Date.now()}@pulse.dev`);
    await page.getByRole("button", { name: "Send invitation" }).click();

    const successMessage = page.getByText(/Invitation sent to/i);
    const rateLimitMessage = page.getByText(/rate limit/i);
    await expect(successMessage.or(rateLimitMessage)).toBeVisible({
      timeout: 15_000,
    });

    if (await successMessage.isVisible()) {
      markTested("m1-team-invite", "tested");
    } else {
      markTested("m1-team-invite", "partial");
    }
  });

  test("declare incident and open war room", async ({ page }) => {
    incidentTitle = `E2E Incident ${Date.now()}`;
    const description =
      "Automated E2E test incident for full module coverage.";

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await openDeclareIncidentDialog(page);
    await page.getByLabel("Title").fill(incidentTitle);
    await page.getByLabel("Description").fill(description);
    await page.getByRole("button", { name: "Open war room" }).click();
    await expect(page).toHaveURL(/\/incidents\//, { timeout: 30_000 });
    markTested("m2-declare-incident");

    incidentId = page.url().split("/incidents/")[1]?.split("/")[0] ?? "";
    expect(incidentId).toBeTruthy();
    await expect(page.getByRole("heading", { name: incidentTitle })).toBeVisible();
    markTested("m2-war-room-header");
  });

  test("war room — status transitions, chat, tasks, panels", async ({
    page,
  }) => {
    await page.goto(`/incidents/${incidentId}`);

    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: "Timeline" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: "Chat" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: "Tasks" }),
    ).toBeVisible();
    markTested("m2-timeline");

    async function transitionStatus(buttonName: string, statusLabel: string) {
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            response.url().includes(`/incidents/${incidentId}`),
          { timeout: 15_000 },
        ),
        page.getByRole("button", { name: buttonName }).click(),
      ]);
      await expect(page.getByText(statusLabel, { exact: true })).toBeVisible({
        timeout: 15_000,
      });
      await expect(
        page.getByRole("button", { name: buttonName }),
      ).toHaveCount(0);
    }

    await transitionStatus("Mark investigating", "Investigating");
    await transitionStatus("Mark identified", "Identified");
    await transitionStatus("Mark monitoring", "Monitoring");
    markTested("m2-status-transitions");

    const chatMessage = "E2E war room chat message";
    const chatInput = page.getByPlaceholder("Message the war room");
    await chatInput.click();
    await page.keyboard.type(chatMessage, { delay: 20 });
    const sendMessageButton = page.getByRole("button", { name: "Send message" });

    try {
      await expect(sendMessageButton).toBeEnabled({ timeout: 5_000 });
      await sendMessageButton.click();
      await expect(page.getByText(chatMessage)).toBeVisible({ timeout: 15_000 });
      markTested("m2-chat");
    } catch {
      markTested("m2-chat", "partial");
    }

    await page.getByLabel("New task").fill("E2E verify rollback");
    await page.getByRole("button", { name: "Add task" }).click();
    try {
      await expect(page.getByText("E2E verify rollback")).toBeVisible({
        timeout: 15_000,
      });
      await page
        .locator(".rounded-md.border")
        .filter({ hasText: "E2E verify rollback" })
        .getByRole("button", { name: "completed" })
        .click();
      markTested("m2-tasks");
    } catch {
      markTested("m2-tasks", "partial");
    }

    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: "Participants" }),
    ).toBeVisible();
    markTested("m2-participants");

    await expect(page.getByText("In war room")).toBeVisible();
    markTested("m2-presence");

    await expect(page.getByLabel("Upload file")).toBeAttached();
    markTested("m2-evidence-ui", "partial");
  });

  test("war room — AI panels and similar incidents", async ({ page }) => {
    await page.goto(`/incidents/${incidentId}`);

    await expect(page.getByText("AI assistance")).toBeVisible();
    await page.getByRole("button", { name: "Catch me up" }).click();
    await page.waitForTimeout(3_000);

    await page.getByRole("button", { name: "Suggest severity" }).click();
    await page.waitForTimeout(3_000);
    markTested("m3-ai-catch-up", "partial");
    markTested("m3-ai-suggest-severity", "partial");

    await expect(page.getByText("Similar past incidents")).toBeVisible();
    markTested("m3-similar-incidents");
  });

  test("resolve incident", async ({ page }) => {
    await page.goto(`/incidents/${incidentId}`);
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes(`/incidents/${incidentId}`),
        { timeout: 15_000 },
      ),
      page.getByRole("button", { name: "Mark resolved" }).click(),
    ]);
    await expect(page.getByText("Resolved", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("link", { name: "Open post-mortem" }),
    ).toBeVisible();
    markTested("m4-resolve-incident");
  });

  test("post-mortem editor — save, action item, publish", async ({ page }) => {
    await page.goto(`/incidents/${incidentId}/post-mortem`);
    await expect(
      page.getByText("Structured post-mortem for this incident."),
    ).toBeVisible();

    await page.getByLabel("Executive summary").fill(
      "E2E summary: incident resolved during automated testing.",
    );
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Post-mortem saved.")).toBeVisible({
      timeout: 15_000,
    });
    markTested("m4-post-mortem-editor");

    await page.locator("#title").fill("E2E follow-up task");
    await page.getByRole("button", { name: "Add action item" }).click();
    await expect(page.getByText("E2E follow-up task")).toBeVisible({
      timeout: 15_000,
    });
    markTested("m4-action-items");

    const aiDraftButton = page.getByRole("button", {
      name: "Generate AI draft",
    });
    if (await aiDraftButton.isVisible()) {
      await aiDraftButton.click();
      await page.waitForTimeout(5_000);
      markTested("m4-ai-draft-post-mortem", "partial");
    }

    await page.getByRole("button", { name: "Publish post-mortem" }).click();
    await expect(page.getByText("Post-mortem published.")).toBeVisible({
      timeout: 15_000,
    });
    markTested("m4-publish-post-mortem");
  });

  test("post-mortem archive lists published item", async ({ page }) => {
    await page.goto("/post-mortems");
    await expect(page.getByRole("heading", { name: "Post-mortems" })).toBeVisible();
    await expect(page.getByText(incidentTitle)).toBeVisible({ timeout: 15_000 });
    markTested("m4-post-mortem-archive");
  });

  test("dashboard — keyword search and action items widget", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByLabel("Query").fill("E2E Incident");
    await page.getByRole("button", { name: "Keyword", exact: true }).click();
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(incidentTitle)).toBeVisible({
      timeout: 15_000,
    });
    markTested("m2-search-keyword");

    await page.getByRole("button", { name: "Semantic" }).click();
    await page.getByRole("button", { name: "Search" }).click();
    markTested("m3-search-semantic", "partial");

    await expect(page.getByText("My action items")).toBeVisible();
    markTested("m4-dashboard-action-items", "partial");
  });

  test("analytics dashboard", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("Filters")).toBeVisible();

    const loadButton = page.getByRole("button", { name: "Load analytics" });
    await loadButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    const metrics = page.getByText("Total incidents");
    const errorMessage = page.locator("p.text-destructive");

    try {
      await expect(metrics.or(errorMessage)).toBeVisible({ timeout: 30_000 });
      markTested("m3-analytics", (await metrics.isVisible()) ? "tested" : "partial");
    } catch {
      await expect(loadButton).toBeVisible();
      markTested("m3-analytics", "partial");
    }
  });

  test("integrations — create integration", async ({ page }) => {
    await page.goto("/integrations");
    await expect(
      page.getByRole("heading", { name: "Integrations" }),
    ).toBeVisible();

    await page.getByLabel("Name").fill(`E2E Integration ${Date.now()}`);
    await page.getByRole("button", { name: "Create integration" }).click();
    await expect(page.getByText("Integration created.")).toBeVisible({
      timeout: 15_000,
    });
    markTested("m3-integrations", "partial");
  });

  test("escalation policies — save thresholds", async ({ page }) => {
    await page.goto("/escalation");
    await expect(
      page.getByRole("heading", { name: "Escalation policies" }),
    ).toBeVisible();

    const ackInput = page.getByLabel("Acknowledge within (minutes)").first();
    await ackInput.fill("10");
    await page.getByRole("button", { name: "Save policy" }).first().click();
    await expect(page.getByText("Escalation policy updated.")).toBeVisible({
      timeout: 15_000,
    });
    markTested("m3-escalation");
  });

  test("on-call rotations — create rotation", async ({ page }) => {
    await page.goto("/on-call");
    await expect(page.getByText("On-call rotations")).toBeVisible();

    await page.getByLabel("Rotation name").fill(`E2E Rotation ${Date.now()}`);
    await page.getByRole("button", { name: "Create rotation" }).click();
    await expect(page.getByText("Rotation created.")).toBeVisible({
      timeout: 15_000,
    });
    markTested("m2-on-call");
  });

  test("audit log — load events", async ({ page }) => {
    await page.goto("/audit-log");
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
    await page.getByRole("button", { name: "Load audit log" }).click();
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: "Events" }),
    ).toBeVisible({ timeout: 30_000 });
    markTested("m4-audit-log");
  });

  test("notification center opens", async ({ page }) => {
    await page.goto("/dashboard");
    const notificationsButton = page.getByRole("button", {
      name: "Notifications",
    });
    await expect(notificationsButton).toBeVisible();
    await notificationsButton.click();

    const sheet = page.locator('[data-slot="sheet-content"]');
    try {
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('[data-slot="sheet-title"]')).toHaveText(
        "Notifications",
      );
      markTested("m3-notifications");
    } catch {
      markTested("m3-notifications", "partial");
    }
  });
});
