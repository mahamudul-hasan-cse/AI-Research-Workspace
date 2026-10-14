import { SIGNAL_FRAGMENT_SHADER, SIGNAL_VERTEX_SHADER } from "./signal-field-shader";

export type SignalFieldState = "animating" | "paused" | "static" | "unsupported";

export type SignalFieldOptions = {
  /** Element whose pointer movement steers the field (the hero section). */
  pointerTarget: HTMLElement;
  /** Draw one still frame instead of animating. */
  reducedMotion: boolean;
  /** Upper bound for devicePixelRatio; the shader cost grows with its square. */
  maxDpr?: number;
  onStateChange?: (state: SignalFieldState) => void;
};

/** Frame drawn under reduced motion: an arbitrary moment with a balanced composition. */
const STATIC_TIME = 14;
/** Share of the remaining distance the pointer glow covers each frame. */
const POINTER_EASING = 0.06;
/** Longest gap counted between frames, so a long-paused tab resumes without a jump. */
const MAX_FRAME_GAP_MS = 100;

type GlResources = {
  program: WebGLProgram;
  buffer: WebGLBuffer;
  shaders: WebGLShader[];
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
};

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Signal field shader failed to compile:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createResources(gl: WebGLRenderingContext): GlResources | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, SIGNAL_VERTEX_SHADER);
  if (!vertex) return null;

  const fragment = compile(gl, gl.FRAGMENT_SHADER, SIGNAL_FRAGMENT_SHADER);
  if (!fragment) {
    gl.deleteShader(vertex);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Signal field program failed to link:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  return {
    program,
    buffer,
    shaders: [vertex, fragment],
    uTime: gl.getUniformLocation(program, "u_time"),
    uResolution: gl.getUniformLocation(program, "u_resolution"),
    uMouse: gl.getUniformLocation(program, "u_mouse"),
  };
}

/**
 * Renders the Research Signal Field into `canvas` and returns a cleanup
 * function. Animates only while the tab is visible and the canvas is on
 * screen; all per-frame work stays outside React.
 */
export function startSignalField(
  canvas: HTMLCanvasElement,
  { pointerTarget, reducedMotion, maxDpr = 1.5, onStateChange }: SignalFieldOptions,
): () => void {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  let resources = gl && !gl.isContextLost() ? createResources(gl) : null;
  if (!gl || !resources) {
    onStateChange?.("unsupported");
    return () => {};
  }

  let state: SignalFieldState | null = null;
  let frameId = 0;
  let elapsedMs = 0;
  let lastNow = 0;
  let dpr = 1;
  let sized = false;
  let pageVisible = document.visibilityState === "visible";
  let onScreen = true;
  let contextLost = false;
  // Pointer positions in device pixels, origin bottom-left (like gl_FragCoord).
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };

  const setState = (next: SignalFieldState) => {
    if (next === state) return;
    state = next;
    onStateChange?.(next);
  };

  const restPointer = () => {
    // With no pointer, the glow rests in the upper right, away from the text.
    pointer.targetX = canvas.width * 0.78;
    pointer.targetY = canvas.height * 0.68;
  };

  const draw = () => {
    if (!resources || contextLost) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(resources.uTime, reducedMotion ? STATIC_TIME : elapsedMs / 1000 + STATIC_TIME);
    gl.uniform2f(resources.uResolution, canvas.width, canvas.height);
    gl.uniform2f(resources.uMouse, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.ready = "true";
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (sized && width === canvas.width && height === canvas.height) return;
    canvas.width = width;
    canvas.height = height;
    if (!pointer.active) {
      restPointer();
      if (!sized || reducedMotion) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }
    }
    sized = true;
    // A paused or static field still needs a frame at the new size.
    if (!frameId) draw();
  };

  const frame = (now: number) => {
    elapsedMs += lastNow ? Math.min(now - lastNow, MAX_FRAME_GAP_MS) : 0;
    lastNow = now;
    pointer.x += (pointer.targetX - pointer.x) * POINTER_EASING;
    pointer.y += (pointer.targetY - pointer.y) * POINTER_EASING;
    draw();
    frameId = requestAnimationFrame(frame);
  };

  const update = () => {
    if (reducedMotion) {
      setState(contextLost ? "unsupported" : "static");
      return;
    }
    const shouldRun = pageVisible && onScreen && !contextLost;
    if (shouldRun && !frameId) {
      lastNow = 0;
      frameId = requestAnimationFrame(frame);
    } else if (!shouldRun && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
    setState(contextLost ? "unsupported" : shouldRun ? "animating" : "paused");
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (reducedMotion) return;
    const rect = canvas.getBoundingClientRect();
    pointer.active = true;
    pointer.targetX = (event.clientX - rect.left) * dpr;
    pointer.targetY = (rect.bottom - event.clientY) * dpr;
  };

  const handlePointerLeave = () => {
    pointer.active = false;
    restPointer();
  };

  const handleVisibility = () => {
    pageVisible = document.visibilityState === "visible";
    update();
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    resources = null;
    delete canvas.dataset.ready;
    update();
  };

  const handleContextRestored = () => {
    resources = createResources(gl);
    contextLost = resources === null;
    update();
    if (!frameId) draw();
  };

  const resizeObserver =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : undefined;
  resizeObserver?.observe(canvas);
  if (!resizeObserver) window.addEventListener("resize", resize);

  const intersectionObserver =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
          onScreen = entry?.isIntersecting ?? true;
          update();
        })
      : undefined;
  intersectionObserver?.observe(canvas);

  pointerTarget.addEventListener("pointermove", handlePointerMove);
  pointerTarget.addEventListener("pointerleave", handlePointerLeave);
  document.addEventListener("visibilitychange", handleVisibility);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  resize();
  draw();
  update();

  return () => {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    resizeObserver?.disconnect();
    if (!resizeObserver) window.removeEventListener("resize", resize);
    intersectionObserver?.disconnect();
    pointerTarget.removeEventListener("pointermove", handlePointerMove);
    pointerTarget.removeEventListener("pointerleave", handlePointerLeave);
    document.removeEventListener("visibilitychange", handleVisibility);
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    if (resources && !gl.isContextLost()) {
      gl.deleteBuffer(resources.buffer);
      for (const shader of resources.shaders) gl.deleteShader(shader);
      gl.deleteProgram(resources.program);
    }
    resources = null;
  };
}
