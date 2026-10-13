import { expect, test } from "@playwright/test";

const MOCK_REPLY = "This is a simulated reply from test mode, so no model request was made.";
const PARTIAL_REPLY = "This is a partial answer that will be interrupted before it finishes.";

test("asks a question, streams the reply, and recovers from a failure with Retry", async ({ page }) => {
  // Each request takes the next scripted reply: a full reply, a mid-stream failure, then a full reply.
  const scripted: string[] = [];
  await page.route("**/api/chat", async (route) => {
    const mode = route.request().headers()["x-chat-sabotage"];
    scripted.push(mode ?? "unscripted");
    // Anything without a scripted reply would be a real model call, so it never leaves the browser.
    if (!mode) return route.abort();
    return route.continue();
  });

  await page.goto("/assistant?sabotage=mock,midstream,mock");

  const chat = page.getByRole("region", { name: "Research assistant chat" });
  const conversation = chat.getByRole("region", { name: "Conversation" });
  const input = chat.getByRole("textbox", { name: "Message the research assistant" });
  const status = chat.getByRole("status");

  // Record every text change in the conversation to prove the reply arrives in pieces.
  await conversation.evaluate((element) => {
    const samples: string[] = [];
    (window as unknown as { __samples: string[] }).__samples = samples;
    new MutationObserver(() => samples.push(element.textContent ?? "")).observe(element, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });

  await input.fill("How do microplastics affect freshwater fish?");
  await chat.getByRole("button", { name: "Send" }).click();

  await expect(conversation.getByText("How do microplastics affect freshwater fish?")).toBeVisible();
  await expect(conversation.getByText(MOCK_REPLY)).toBeVisible();
  await expect(status).toHaveText("Assistant finished responding.");

  const samples = await page.evaluate(() => (window as unknown as { __samples: string[] }).__samples);
  const partials = samples.filter(
    (text) => text.includes("This is a simulated") && !text.includes(MOCK_REPLY),
  );
  expect(partials.length).toBeGreaterThan(1);

  // The second question fails part-way through its reply.
  await input.fill("Which species are most exposed?");
  await input.press("Enter");

  const alert = conversation.getByRole("alert");
  await expect(alert).toContainText("Response interrupted");
  await expect(conversation.getByText(PARTIAL_REPLY)).toBeVisible();
  await expect(chat.getByRole("button", { name: "Failed" })).toBeVisible();

  await alert.getByRole("button", { name: "Retry" }).click();

  await expect(alert).toBeHidden();
  await expect(conversation.getByText(MOCK_REPLY)).toHaveCount(2);
  await expect(conversation.getByText(PARTIAL_REPLY)).toBeHidden();
  await expect(conversation.getByText("Which species are most exposed?")).toHaveCount(1);
  await expect(status).toHaveText("Assistant finished responding.");

  expect(scripted).toEqual(["mock", "midstream", "mock"]);
});
