import { afterEach, describe, expect, it, vi } from "vitest";
import { detectWebGLSupport } from "./webgl-support";

describe("detectWebGLSupport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when getContext yields no WebGL", () => {
    vi.spyOn(document, "createElement").mockReturnValue({
      getContext: () => null,
    } as unknown as HTMLCanvasElement);
    expect(detectWebGLSupport()).toBe(false);
  });

  it("returns true when webgl2 or webgl is available", () => {
    vi.spyOn(document, "createElement").mockReturnValue({
      getContext: (type: string) => (type === "webgl2" ? {} : null),
    } as unknown as HTMLCanvasElement);
    expect(detectWebGLSupport()).toBe(true);
  });
});
