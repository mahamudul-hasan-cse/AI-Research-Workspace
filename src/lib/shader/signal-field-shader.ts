import { SIGNAL_COLOR_CAP } from "./signal-field-palette";

const glslVec3 = (rgb: readonly number[]) => `vec3(${rgb.map((c) => c.toFixed(3)).join(", ")})`;

/** One oversized triangle covers the viewport, so no index buffer or quad seam is needed. */
export const SIGNAL_VERTEX_SHADER = /* glsl */ `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const SIGNAL_FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

uniform float u_time;        // seconds of animation (frozen under reduced motion)
uniform vec2 u_resolution;   // drawing-buffer size in device pixels
uniform vec2 u_mouse;        // eased pointer position in device pixels, origin bottom-left

const vec3 NAVY = vec3(0.035, 0.050, 0.125);
const vec3 INDIGO = vec3(0.190, 0.180, 0.540);
const vec3 VIOLET = vec3(0.420, 0.260, 0.720);
const vec3 SIGNAL = vec3(0.560, 0.600, 1.000);
const vec3 COLOR_CAP = ${glslVec3(SIGNAL_COLOR_CAP)};

// Cheap hash -> value noise -> a few octaves of rotated fbm. Rotating each
// octave hides the grid that plain value noise tends to show.
float hash(vec2 p) {
  p = fract(p * vec2(127.13, 311.71));
  p += dot(p, p + 34.17);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  vec2 blend = local * local * (3.0 - 2.0 * local);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int octave = 0; octave < 4; octave++) {
    sum += amplitude * valueNoise(p);
    p = turn * p * 2.03;
    amplitude *= 0.5;
  }
  return sum;
}

void main() {
  // Coordinate normalization: center the origin and divide by the shorter
  // side, so the field keeps its proportions on phones and wide screens.
  float unit = min(u_resolution.x, u_resolution.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / unit;
  vec2 pointer = (u_mouse - 0.5 * u_resolution) / unit;

  // Time-based motion: a very slow clock so the drift reads as calm, with
  // the two warp layers moving in different directions.
  float t = u_time * 0.055;

  // Mouse influence: a soft Gaussian "lens" around the pointer that nudges
  // the field sideways (the signals bend around the cursor) and adds glow.
  vec2 fromPointer = uv - pointer;
  float lens = exp(-dot(fromPointer, fromPointer) * 4.0);
  vec2 p = uv * 1.7 + vec2(-fromPointer.y, fromPointer.x) * lens * 0.35;

  // Noise/wave calculation: domain-warped fbm gives the flowing "data
  // current"; contour bands of that field become thin travelling signal
  // lines, faded so they stay in the background.
  vec2 warp = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(4.7, -0.8 * t)));
  float field = fbm(p + 1.8 * warp + vec2(0.6 * t, 0.0));
  float wave = 0.5 + 0.5 * sin(field * 10.0 + uv.x * 1.4 - t * 6.0);
  float signal = smoothstep(0.93, 1.0, wave) * smoothstep(0.25, 0.65, field);

  // Color composition: navy base, indigo where the field is dense, violet
  // highlights from the warp layer, then signal lines and pointer glow.
  // A vignette darkens the edges and the cap keeps text contrast guaranteed.
  vec3 color = mix(NAVY, INDIGO, smoothstep(0.25, 0.85, field));
  color = mix(color, VIOLET, 0.55 * smoothstep(0.55, 0.95, warp.x));
  color += SIGNAL * signal * 0.22;
  color += VIOLET * lens * 0.18;
  color *= 1.0 - 0.45 * dot(uv * 0.55, uv * 0.55);
  color = min(color, COLOR_CAP);

  gl_FragColor = vec4(color, 1.0);
}
`;
