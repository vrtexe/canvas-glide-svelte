import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { on } from 'svelte/events';
import { createEngine, type CanvasEngine, type CanvasEngineOptions, type Rect, type Transform } from 'canvas-glide';
import { createConstrainer } from './util/constraint.js';
import type { Size } from './util/size.js';

export type GlideOptions = Omit<CanvasEngineOptions, 'getViewportRect' | 'getCanvasRect'> & {
  /** Unscaled content size; defaults to `contentSize`. */
  getCanvasRect?: () => Rect | null;
};

/**
 * Pan and zoom state for one viewport. Attach it with `{@attach glide.viewport}`; `transform`, `moving`,
 * `viewportSize` and `contentSize` are reactive. Options are read once, when the instance is created.
 */
export class Glide {
  /** The current transform, updated at most once per animation frame. */
  transform = $state.raw<Transform>({ origin: { x: 0, y: 0 }, scale: 1 });
  /** Whether a pointer drag is in progress. */
  moving = $state(false);
  /** The attached element's size in CSS pixels. */
  viewportSize = $state.raw<Size>({ width: 0, height: 0 });
  /** The content's size at scale 1, used by fit, center and the default pan limit. */
  contentSize = $state.raw<Size | null>(null);

  readonly engine: CanvasEngine;

  #element: HTMLElement | null = null;
  #frame = 0;

  constructor(options: GlideOptions = {}) {
    const getViewportRect = () => this.#element?.getBoundingClientRect() ?? null;
    const getCanvasRect =
      options.getCanvasRect ??
      (() => {
        const size = untrack(() => this.contentSize);
        return size && { x: 0, y: 0, ...size };
      });

    this.engine = createEngine({
      ...options,
      getViewportRect,
      getCanvasRect,
      constraints: {
        ...options.constraints,
        origin: options.constraints?.origin ?? {
          enabled: true,
          constrain: createConstrainer({ getViewportRect, getCanvasRect, getScale: () => this.engine.getScale() }),
        },
      },
      state: {
        ...options.state,
        onTransformChange: (transform) => {
          this.#schedule();
          options.state?.onTransformChange?.(transform);
        },
      },
      move: {
        ...options.move,
        onIsMovingChange: (moving) => {
          this.moving = moving;
          options.move?.onIsMovingChange?.(moving);
        },
      },
    });

    this.transform = this.engine.getTransform();
  }

  /** Makes an element the viewport: pointer and wheel input, its position for zoom anchoring, and its size. */
  viewport: Attachment<HTMLElement> = (node) => {
    this.#element = node;
    node.style.touchAction = 'none';
    node.style.userSelect = 'none';

    const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onWheel } = this.engine.event;
    const off = [
      on(node, 'pointerdown', onPointerDown),
      on(node, 'pointermove', onPointerMove),
      on(node, 'pointerup', onPointerUp),
      on(node, 'pointercancel', onPointerCancel),
      on(node, 'wheel', onWheel, { passive: false }),
    ];

    const measure = () => (this.viewportSize = { width: node.clientWidth, height: node.clientHeight });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);
    measure();

    return () => {
      off.forEach((detach) => detach());
      resizeObserver.disconnect();
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      if (this.#element === node) this.#element = null;
    };
  };

  zoomIn(step?: number) {
    this.engine.zoomIn(step);
  }

  zoomOut(step?: number) {
    this.engine.zoomOut(step);
  }

  /** Sets the scale, keeping `pivot` (viewport pixels) or the viewport centre in place. */
  zoomTo(scale: number, pivot?: { x: number; y: number }) {
    this.engine.zoomTo(scale, pivot);
  }

  panTo(origin: { x: number; y: number }) {
    this.engine.panTo(origin);
  }

  setTransform(transform: Transform) {
    this.engine.setTransform(transform);
  }

  fit() {
    this.engine.fit();
  }

  center() {
    this.engine.center();
  }

  reset() {
    this.engine.reset();
  }

  #schedule() {
    if (this.#frame || typeof requestAnimationFrame === 'undefined') return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.transform = this.engine.getTransform();
    });
  }
}
