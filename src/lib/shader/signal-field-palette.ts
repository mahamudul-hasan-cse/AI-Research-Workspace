/** RGB triplet with channels in 0–1 (sRGB, as written to the canvas). */
export type Rgb = readonly [number, number, number];

/** Brightest color the shader may output; keeps hero text readable over any frame. */
export const SIGNAL_COLOR_CAP: Rgb = [0.42, 0.36, 0.75];

/** Navy layer between the shader and the hero text. */
export const HERO_SCRIM = { color: [11, 16, 32] as Rgb, alpha: 0.45 };

/** Hero text colors (sRGB 0–255), used by the hero and the contrast check. */
export const HERO_TEXT = {
  heading: [255, 255, 255] as Rgb,
  body: [224, 231, 255] as Rgb,
};

/** CSS fallback with the shader's palette, shown before WebGL draws or if it is unavailable. */
export const SIGNAL_FALLBACK_GRADIENT =
  "radial-gradient(120% 90% at 78% 30%, #3b2a6b 0%, transparent 55%), " +
  "radial-gradient(90% 80% at 15% 85%, #1e1b4b 0%, transparent 60%), " +
  "linear-gradient(160deg, #0b1020 0%, #141a3a 55%, #0b1020 100%)";

function toLinear(channel: number) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: Rgb) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: Rgb, b: Rgb) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The lightest background the hero text can sit on: the capped shader color under the scrim. */
export function brightestHeroBackground(): Rgb {
  const scrim = HERO_SCRIM.color.map((channel) => channel / 255);
  return SIGNAL_COLOR_CAP.map(
    (channel, i) => channel * (1 - HERO_SCRIM.alpha) + scrim[i] * HERO_SCRIM.alpha,
  ) as unknown as Rgb;
}
