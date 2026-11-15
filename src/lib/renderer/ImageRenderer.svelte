<script lang="ts">
  import type { Glide } from '../glide.svelte.js';
  import { createAsyncMemo } from '../util/asyncMemo.svelte.js';
  import { createImageUrlSafe, revokeImageUrl } from '../util/image.js';
  import { fitInto, type Size } from '../util/size.js';

  let { glide, image }: { glide: Glide; image?: Blob | null } = $props();

  const src = createAsyncMemo(() => createImageUrlSafe(image), revokeImageUrl);

  let loaded = $state.raw<{ src: string; natural: Size } | null>(null);
  const natural = $derived(loaded && loaded.src === src.current ? loaded.natural : null);

  $effect(() => {
    glide.contentSize = natural && fitInto(glide.viewportSize, natural);
  });

  function onload(event: Event) {
    const img = event.currentTarget as HTMLImageElement;
    loaded = { src: img.getAttribute('src') ?? '', natural: { width: img.naturalWidth, height: img.naturalHeight } };
    glide.contentSize = fitInto(glide.viewportSize, loaded.natural);
    glide.fit();
  }
</script>

<div
  class="glide-image-stage"
  style:width="{glide.contentSize?.width ?? 0}px"
  style:height="{glide.contentSize?.height ?? 0}px"
  style:transform="scale({glide.transform.scale}) translate({-glide.transform.origin.x}px, {-glide.transform.origin.y}px)"
>
  {#if src.current}
    <img
      class="glide-image"
      src={src.current}
      alt=""
      draggable="false"
      style:visibility={natural ? 'visible' : 'hidden'}
      {onload}
    />
  {/if}
</div>

<style>
  .glide-image-stage {
    position: relative;
    transform-origin: 0 0;
  }

  .glide-image {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
