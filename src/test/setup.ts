import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// No test may reach a real AI provider: any fetch a test has not stubbed fails loudly.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      throw new Error(`Unmocked fetch in test: ${String(input)}`);
    }),
  );
});

afterEach(() => {
  cleanup();
});
