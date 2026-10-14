import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startSignalField, type SignalFieldState } from "./signal-field-renderer";

/** Just enough of WebGLRenderingContext for the renderer, recording uniform writes. */
function createFakeGl() {
  const uniforms = new Map<string, number[]>();
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TRIANGLES: 8,
    isContextLost: () => false,
    createShader: () => ({}),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: () => true,
    getProgramInfoLog: () => undefined,
    useProgram: vi.fn(),
    createBuffer: () => ({}),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: () => 0,
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: (_program: unknown, name: string) => name,
    viewport: vi.fn(),
    uniform1f: (name: string, value: number) => uniforms.set(name, [value]),
    uniform2f: (name: string, x: number, y: number) => uniforms.set(name, [x, y]),
    drawArrays: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),
  };
  return { gl, uniforms };
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("startSignalField", () => {
  let fake: ReturnType<typeof createFakeGl>;
  let canvas: HTMLCanvasElement;
  let host: HTMLElement;
  let states: SignalFieldState[];
  const requestFrame = vi.fn<(callback: FrameRequestCallback) => number>(() => 1);
  const cancelFrame = vi.fn();

  beforeEach(() => {
    fake = createFakeGl();
    host = document.createElement("section");
    canvas = document.createElement("canvas");
    host.append(canvas);
    document.body.append(host);
    vi.spyOn(canvas, "getContext").mockReturnValue(fake.gl as unknown as WebGLRenderingContext);
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 300 }),
    );
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    vi.stubGlobal("devicePixelRatio", 3);
    requestFrame.mockClear();
    cancelFrame.mockClear();
    states = [];
  });

  afterEach(() => {
    host.remove();
    setVisibility("visible");
  });

  const start = (reducedMotion = false) =>
    startSignalField(canvas, {
      pointerTarget: host,
      reducedMotion,
      onStateChange: (state) => states.push(state),
    });

  it("animates with all three uniforms and caps the pixel ratio", () => {
    const stop = start();

    expect(states).toEqual(["animating"]);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    // 400x300 CSS px at the 1.5 DPR cap, not the device's 3.
    expect([canvas.width, canvas.height]).toEqual([600, 450]);
    expect(fake.uniforms.get("u_resolution")).toEqual([600, 450]);
    expect(fake.uniforms.has("u_time")).toBe(true);
    expect(fake.uniforms.has("u_mouse")).toBe(true);
    stop();
  });

  it("pauses while the tab is hidden and resumes when it is shown", () => {
    const stop = start();

    setVisibility("hidden");
    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe("paused");

    setVisibility("visible");
    expect(requestFrame).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toBe("animating");
    stop();
  });

  it("draws one static frame under reduced motion and ignores the pointer", () => {
    const stop = start(true);

    expect(states).toEqual(["static"]);
    expect(requestFrame).not.toHaveBeenCalled();
    expect(fake.gl.drawArrays).toHaveBeenCalled();
    const restingMouse = fake.uniforms.get("u_mouse");

    host.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 10 }));
    expect(requestFrame).not.toHaveBeenCalled();
    expect(fake.uniforms.get("u_mouse")).toEqual(restingMouse);
    stop();
  });

  it("eases the glow toward the pointer in device pixels from the bottom-left", () => {
    const stop = start();
    host.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, clientY: 50 }));

    // Run many frames so the easing settles on the target.
    const frame = requestFrame.mock.calls[0][0];
    for (let i = 0; i < 200; i++) frame(16 * i);

    const [x, y] = fake.uniforms.get("u_mouse")!;
    expect(x).toBeCloseTo(100 * 1.5, 0);
    expect(y).toBeCloseTo((300 - 50) * 1.5, 0);
    stop();
  });

  it("cleans up its frame, listeners and GL objects", () => {
    const stop = start();
    stop();

    expect(cancelFrame).toHaveBeenCalled();
    expect(fake.gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(fake.gl.deleteBuffer).toHaveBeenCalledTimes(1);

    requestFrame.mockClear();
    setVisibility("hidden");
    setVisibility("visible");
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("reports unsupported when WebGL is unavailable", () => {
    vi.mocked(canvas.getContext).mockReturnValue(null);
    const stop = start();
    expect(states).toEqual(["unsupported"]);
    expect(requestFrame).not.toHaveBeenCalled();
    stop();
  });

  it("deletes partial GL resources when shader setup fails", () => {
    fake.gl.getProgramParameter = () => false;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const stop = start();

    expect(states).toEqual(["unsupported"]);
    expect(fake.gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(fake.gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(requestFrame).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "Signal field program failed to link:",
      undefined,
    );
    stop();
  });
});
