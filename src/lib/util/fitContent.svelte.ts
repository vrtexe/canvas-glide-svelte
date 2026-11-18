import { untrack } from 'svelte';
import type { Glide } from '../glide.svelte.js';
import { fitInto, type Size } from './size.js';

/** Sets `glide().contentSize` from `content` and fits each new `content` once the viewport has a size; call during init. */
export function fitContent(glide: () => Glide, content: () => Size | null) {
  // Compared by identity: a resize re-runs the effect with the same object and keeps the view. An image can load while
  // the viewport is still 0×0 (hidden, or not laid out yet), so the fit waits for a measured size.
  let fitted: Size | null = null;

  $effect(() => {
    const g = glide();
    const size = content();
    const viewport = g.viewportSize;
    g.contentSize = size && fitInto(viewport, size);
    if (size && size !== fitted && viewport.width && viewport.height) {
      fitted = size;
      untrack(() => g.fit());
    }
  });
}
