<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { Glide } from '../glide.svelte.js';
  import { createAsyncMemo } from '../util/asyncMemo.svelte.js';
  import { createImageBitmapSafe } from '../util/image.js';
  import { fitContent } from '../util/fitContent.svelte.js';

  let { glide, image }: { glide: Glide; image?: Blob | null } = $props();

  const bitmap = createAsyncMemo(
    () => createImageBitmapSafe(image),
    (value) => value?.close(),
  );

  fitContent(() => glide, () => bitmap.current);

  // Re-runs whenever the transform, the viewport size or the image changes.
  const draw: Attachment<HTMLCanvasElement> = (canvas) => {
    const context = canvas.getContext('2d');
    if (!context) return;

    const { width, height } = glide.viewportSize;
    const { origin, scale } = glide.transform;
    const size = glide.contentSize;
    const current = bitmap.current;

    // devicePixelRatio is not reactive: a change (window moved to another screen) is picked up on the next frame.
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    context.resetTransform();
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!current || !size) return;

    const s = scale * dpr;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.setTransform(s, 0, 0, s, -origin.x * s, -origin.y * s);
    context.drawImage(current, 0, 0, size.width, size.height);
  };
</script>

<canvas class="glide-canvas-renderer" {@attach draw}></canvas>

<style>
  .glide-canvas-renderer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
