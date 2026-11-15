<!--
  Scroll-based renderer: no CSS transform and no <canvas>. Zoom resizes the <img>, so the browser rasterizes it at its
  displayed size, and pan scrolls an overflow: hidden box. The img's padding adds one viewport of slack on every side,
  so the image can be panned fully off-screen and negative origins are reachable scroll positions.
-->
<script lang="ts">
  import type { Glide } from '../glide.svelte.js';
  import { createAsyncMemo } from '../util/asyncMemo.svelte.js';
  import { createImageUrlSafe, revokeImageUrl } from '../util/image.js';
  import { fitInto, type Size } from '../util/size.js';

  let { glide, image }: { glide: Glide; image?: Blob | null } = $props();

  let scroller = $state<HTMLDivElement>();

  const src = createAsyncMemo(() => createImageUrlSafe(image), revokeImageUrl);

  let loaded = $state.raw<{ src: string; natural: Size } | null>(null);
  const natural = $derived(loaded && loaded.src === src.current ? loaded.natural : null);

  $effect(() => {
    glide.contentSize = natural && fitInto(glide.viewportSize, natural);
  });

  const padX = $derived(glide.viewportSize.width);
  const padY = $derived(glide.viewportSize.height);

  $effect(() => {
    const { origin, scale } = glide.transform;
    if (natural) scroller?.scrollTo(padX + origin.x * scale, padY + origin.y * scale);
  });

  function onload(event: Event) {
    const img = event.currentTarget as HTMLImageElement;
    loaded = { src: img.getAttribute('src') ?? '', natural: { width: img.naturalWidth, height: img.naturalHeight } };
    glide.contentSize = fitInto(glide.viewportSize, loaded.natural);
    glide.fit();
  }
</script>

<div bind:this={scroller} class="glide-scroller">
  {#if src.current}
    <img
      class="glide-scroller-image"
      src={src.current}
      alt=""
      draggable="false"
      style:width="{(glide.contentSize?.width ?? 0) * glide.transform.scale}px"
      style:height="{(glide.contentSize?.height ?? 0) * glide.transform.scale}px"
      style:padding="{padY}px {padX}px"
      {onload}
    />
  {/if}
</div>

<style>
  .glide-scroller {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .glide-scroller-image {
    display: block;
    box-sizing: content-box;
  }
</style>
