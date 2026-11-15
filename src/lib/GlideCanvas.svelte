<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { Glide } from './glide.svelte.js';

  export type Renderer = (typeof Renderer)[keyof typeof Renderer];
  export const Renderer = Object.freeze({
    Canvas: 'canvas',
    Image: 'image',
    /** Renders the image as a resized, scrolled `<img>`, not arbitrary HTML. */
    Html: 'html',
  } as const);

  export type GlideCanvasProps = HTMLAttributes<HTMLDivElement> & {
    /** The pan and zoom state; pass your own to control it from outside. */
    glide?: Glide;
    /** The image to show; `null` clears the view. */
    image?: Blob | null;
    renderer?: Renderer;
    /** Overlay content, laid out in image coordinates at scale 1 and moved and scaled with the image. */
    children?: Snippet;
  };
</script>

<script lang="ts">
  import CanvasRenderer from './renderer/CanvasRenderer.svelte';
  import ImageRenderer from './renderer/ImageRenderer.svelte';
  import HtmlRenderer from './renderer/HtmlRenderer.svelte';

  let { glide, image, renderer = Renderer.Canvas, children, class: className, ...rest }: GlideCanvasProps = $props();

  const fallback = new Glide();
  const g = $derived(glide ?? fallback);
</script>

<div
  class={['glide-canvas', className]}
  style:cursor={g.moving ? 'grabbing' : g.engine.isPanEnabled() ? 'grab' : null}
  {...rest}
  {@attach g.viewport}
>
  {#if renderer === Renderer.Image}
    <ImageRenderer glide={g} {image} />
  {:else if renderer === Renderer.Html}
    <HtmlRenderer glide={g} {image} />
  {:else}
    <CanvasRenderer glide={g} {image} />
  {/if}

  {#if children && g.contentSize}
    <div
      class="glide-overlay"
      style:width="{g.contentSize.width}px"
      style:height="{g.contentSize.height}px"
      style:transform="scale({g.transform.scale}) translate({-g.transform.origin.x}px, {-g.transform.origin.y}px)"
    >
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .glide-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    overscroll-behavior: contain;
  }

  .glide-overlay {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
  }
</style>
