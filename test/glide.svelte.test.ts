// @vitest-environment jsdom
import { afterEach, test } from "vitest";
import assert from "node:assert/strict";
import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { Glide, GlideCanvas, Renderer } from "../src/lib/index.ts";

// jsdom has no layout, no ResizeObserver, no pointer capture, no 2D context and no createImageBitmap.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1000 });
Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 700 });
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
globalThis.createImageBitmap = (async () => ({ width: 300, height: 300, close() {} })) as unknown as typeof createImageBitmap;

type FakeContext = { calls: string[] };
const contexts = new WeakMap<HTMLCanvasElement, FakeContext>();
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  if (!contexts.has(this)) {
    const calls: string[] = [];
    contexts.set(this, {
      calls,
      resetTransform: () => calls.push("reset"),
      clearRect: () => calls.push("clear"),
      setTransform: () => calls.push("transform"),
      drawImage: () => calls.push("draw"),
    } as FakeContext);
  }
  return contexts.get(this);
} as unknown as HTMLCanvasElement["getContext"];

const setDevicePixelRatio = (value: number) =>
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value });

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  setDevicePixelRatio(1);
});

/** An element attached as the viewport, with a stubbed client rectangle. */
function attach(glide: Glide, rect = { x: 0, y: 0, width: 800, height: 600 }) {
  const node = document.body.appendChild(document.createElement("div"));
  node.getBoundingClientRect = () => ({ ...rect }) as DOMRect;
  const detach = glide.viewport(node);
  cleanups.push(() => {
    detach?.();
    node.remove();
  });
  return { node, rect };
}

function render(props: Record<string, unknown>) {
  const target = document.body.appendChild(document.createElement("div"));
  const component = mount(GlideCanvas, { target, props });
  cleanups.push(() => {
    unmount(component);
    target.remove();
  });
  return target;
}

/** Lets pending promises (image decoding), one animation frame and Svelte's effects run. */
async function settle() {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    flushSync();
  }
}

const canvasRect = () => ({ x: 0, y: 0, width: 400, height: 300 });

test("a scale range in constraints keeps the default origin limit", () => {
  const glide = new Glide({ getCanvasRect: canvasRect, constraints: { scale: { constraints: [1, 4] } } });
  attach(glide);

  glide.zoomTo(10);
  glide.panTo({ x: 5000, y: 5000 });

  assert.equal(glide.engine.getScale(), 4);
  assert.deepEqual(glide.engine.getOrigin(), { x: 400, y: 300 });
});

test("constraints.origin replaces the default origin limit", () => {
  const origin = { constraints: { x: [0, 10], y: [0, 10] } as { x: [number, number]; y: [number, number] } };
  const glide = new Glide({ getCanvasRect: canvasRect, constraints: { origin } });
  attach(glide);

  glide.panTo({ x: 5000, y: 5000 });

  assert.deepEqual(glide.engine.getOrigin(), { x: 10, y: 10 });
});

test("a wheel zoom anchors at the cursor after the viewport moved", async () => {
  const glide = new Glide({ getCanvasRect: canvasRect });
  const { node, rect } = attach(glide);
  // svelte/events `on` adds pointer and wheel listeners in a microtask.
  await Promise.resolve();
  glide.center();
  rect.x = 150;

  const before = glide.engine.getTransform();
  node.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, clientX: 150 + 400, clientY: 300, cancelable: true }));
  const after = glide.engine.getTransform();

  assert.ok(after.scale > before.scale);
  assert.ok(Math.abs(after.origin.x + 400 / after.scale - (before.origin.x + 400 / before.scale)) < 1e-9);
});

test("transform updates once per animation frame, moving follows a drag", async () => {
  const glide = new Glide({ getCanvasRect: canvasRect });
  const { node } = attach(glide);

  glide.zoomIn();
  glide.zoomIn();
  assert.equal(glide.transform.scale, 1);
  await settle();
  assert.deepEqual(glide.transform, glide.engine.getTransform());

  node.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, button: 0, clientX: 10, clientY: 10 }));
  assert.equal(glide.moving, true);
  node.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, button: 0, clientX: 10, clientY: 10 }));
  assert.equal(glide.moving, false);
});

test("the canvas renderer clears the canvas when the image is removed", async () => {
  const props = $state<{ image: Blob | null }>({ image: new Blob(["x"], { type: "image/png" }) });
  const target = render(props);
  await settle();
  const calls = contexts.get(target.querySelector("canvas")!)!.calls;
  assert.ok(calls.includes("draw"));

  calls.length = 0;
  props.image = null;
  await settle();

  assert.ok(calls.includes("clear"));
  assert.ok(!calls.includes("draw"));
});

test("the canvas renderer resizes its backing store when devicePixelRatio changes", async () => {
  const glide = new Glide();
  const target = render({ glide, image: new Blob(["x"], { type: "image/png" }) });
  await settle();
  const canvas = target.querySelector("canvas")!;
  assert.equal(canvas.width, 1000);

  setDevicePixelRatio(2);
  glide.zoomIn();
  await settle();

  assert.equal(canvas.width, 2000);
  assert.equal(canvas.height, 1400);
});

test("the image renderer shows an SVG through a data: URL", async () => {
  const target = render({
    renderer: Renderer.Image,
    image: new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" }),
  });
  await settle();

  assert.match(target.querySelector("img")!.getAttribute("src") ?? "", /^data:image\/svg\+xml;base64,/);
});

test("children render in an overlay sized to the content and moved with the transform", async () => {
  const glide = new Glide();
  const children = createRawSnippet(() => ({ render: () => "<span>marker</span>" }));
  const target = render({ glide, image: new Blob(["x"], { type: "image/png" }), children });
  await settle();

  const overlay = target.querySelector<HTMLElement>(".glide-overlay")!;
  assert.equal(overlay.style.width, "700px");
  assert.equal(overlay.style.height, "700px");

  glide.zoomTo(2, { x: 0, y: 0 });
  await settle();
  assert.match(overlay.style.transform, /^scale\(2\)/);
});
