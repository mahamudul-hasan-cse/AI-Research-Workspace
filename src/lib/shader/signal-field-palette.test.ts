import { describe, expect, it } from "vitest";
import {
  brightestHeroBackground,
  contrastRatio,
  HERO_TEXT,
  SIGNAL_COLOR_CAP,
} from "./signal-field-palette";
import { SIGNAL_FRAGMENT_SHADER } from "./signal-field-shader";

const toUnit = (rgb: readonly number[]) => rgb.map((c) => c / 255) as unknown as [number, number, number];

describe("Signal field contrast", () => {
  it("keeps the hero text above WCAG AA even over the brightest possible frame", () => {
    const background = brightestHeroBackground();
    // Body copy is regular-size text, so it needs 4.5:1; aim higher for a moving background.
    expect(contrastRatio(toUnit(HERO_TEXT.body), background)).toBeGreaterThan(7);
    expect(contrastRatio(toUnit(HERO_TEXT.heading), background)).toBeGreaterThan(7);
  });

  it("applies the same brightness cap inside the shader", () => {
    const cap = SIGNAL_COLOR_CAP.map((c) => c.toFixed(3)).join(", ");
    expect(SIGNAL_FRAGMENT_SHADER).toContain(`const vec3 COLOR_CAP = vec3(${cap});`);
    expect(SIGNAL_FRAGMENT_SHADER).toContain("color = min(color, COLOR_CAP);");
  });

  it("declares the three required uniforms", () => {
    for (const uniform of ["u_time", "u_resolution", "u_mouse"]) {
      expect(SIGNAL_FRAGMENT_SHADER).toMatch(new RegExp(`uniform \\w+ ${uniform};`));
    }
  });
});
