# @canvas-glide/svelte

Pan, zoom and pinch-to-zoom for Svelte 5, built on [canvas-glide](https://github.com/vrtexe/canvas-glide): a `Glide` class with reactive state, an attachment that turns any element into a pan-and-zoom viewport, and a ready `GlideCanvas` image viewer.

[![npm version](https://img.shields.io/npm/v/@canvas-glide/svelte.svg?style=flat-square)](https://www.npmjs.com/package/@canvas-glide/svelte)
[![license](https://img.shields.io/npm/l/@canvas-glide/svelte.svg?style=flat-square)](LICENSE.md)

The package ships `.svelte` sources with the `svelte` export condition, so your own Svelte compiler builds them. It needs Svelte 5.29 or newer, for attachments. Components render on the server; input handling starts when the attachment runs in the browser.

## Install

```sh
npm install @canvas-glide/svelte
```

`canvas-glide` is a dependency and installs with it. `svelte` is a peer dependency.

## Image viewer

```svelte
<script lang="ts">
  import { Glide, GlideCanvas, Renderer } from '@canvas-glide/svelte';

  const glide = new Glide();
  let file = $state<File | null>(null);
</script>

<input type="file" accept="image/*" onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)} />
<button onclick={() => glide.zoomIn()}>+</button>
<button onclick={() => glide.zoomOut()}>−</button>
<button onclick={() => glide.fit()}>Fit</button>
<span>{Math.round(glide.transform.scale * 100)}%</span>

<div style="width: 800px; height: 500px">
  <GlideCanvas {glide} image={file} renderer={Renderer.Image} />
</div>
```

`GlideCanvas` fills its parent, so the parent needs a size. At scale 1 the image is fitted inside the box with its aspect ratio kept, and a new image starts fitted. The image can be panned until it just leaves the box, and no further. Without a `glide` prop, `GlideCanvas` creates its own.

## Glide

`new Glide(options?)` holds the pan and zoom state of one viewport. These fields are reactive, so templates, `$derived` and `$effect` follow them:

| Field | Type | Meaning |
|---|---|---|
| `transform` | `Transform` | The current `{ origin, scale }`, updated at most once per animation frame. |
| `moving` | `boolean` | Whether a pointer drag is in progress. |
| `viewportSize` | `Size` | The attached element's size in CSS pixels. |
| `contentSize` | `Size \| null` | The content's size at scale 1; `fit`, `center` and the default pan limit use it. You can assign it. |

The methods are `zoomIn(step?)`, `zoomOut(step?)`, `zoomTo(scale, pivot?)`, `panTo(origin)`, `setTransform(transform)`, `fit()`, `center()` and `reset()`. `glide.engine` is the underlying engine, with every method documented in the [canvas-glide README](https://github.com/vrtexe/canvas-glide#methods).

`options` are the [canvas-glide options](https://github.com/vrtexe/canvas-glide#options) without `getViewportRect`, which the attachment provides. `getCanvasRect` is optional and defaults to `contentSize`. Glide adds a default origin limit that keeps the content reachable; `constraints.origin` replaces it. The options are read once, when the instance is created.

## Your own content

`{@attach glide.viewport}` makes an element the viewport. The attachment listens to pointer and wheel input (the wheel listener is not passive, so the wheel zooms instead of scrolling the page), sets `touch-action: none` and `user-select: none`, and tracks the element's size and position. This example pans and zooms a 1200 by 800 pixel `<div>`:

```svelte
<script lang="ts">
  import { Glide } from '@canvas-glide/svelte';

  const glide = new Glide();
  glide.contentSize = { width: 1200, height: 800 };

  const { origin, scale } = $derived(glide.transform);
</script>

<div class="viewport" {@attach glide.viewport}>
  <div
    class="content"
    style:transform="translate({-origin.x * scale}px, {-origin.y * scale}px) scale({scale})"
  >
    Your content
  </div>
</div>

<style>
  .viewport {
    width: 800px;
    height: 500px;
    overflow: hidden;
  }

  .content {
    width: 1200px;
    height: 800px;
    transform-origin: 0 0;
  }
</style>
```

## GlideCanvas

| Prop | Type | Usage |
|---|---|---|
| `glide` | `Glide` | The state to use; pass your own to read it and call its methods. |
| `image` | `Blob \| null` | The image to show; a `File` from an `<input type="file">` is a `Blob`. `null` clears the view. |
| `renderer` | `Renderer` | `Renderer.Canvas` (default), `Renderer.Image` or `Renderer.Html`. |
| `children` | `Snippet` | Overlay content in image coordinates at scale 1, moved and scaled with the image, for markers and annotations. |

Every other attribute, such as `class`, `style` or an event handler, goes to the outer `<div>`.

| Renderer | How it draws |
|---|---|
| `Renderer.Canvas` | Draws the decoded bitmap into a `<canvas>` sized in device pixels. |
| `Renderer.Image` | Moves and scales an `<img>` with a CSS `transform`. |
| `Renderer.Html` | Resizes the `<img>` to the zoomed size and scrolls its container, with no CSS transform, so the browser rasterizes the image at its displayed size. |

The image and HTML renderers load PNG, JPEG, GIF, WebP, AVIF and BMP through a `blob:` URL and every other type, such as SVG, through a `data:` URL, so a script inside an uploaded SVG cannot run in your page's origin.

## Development

The package source is `src/lib`, and `npm run dev` starts a demo app (`src/App.svelte`) that uses it. `canvas-glide` comes from npm; to work against an unreleased engine, build it and run `npm link ../lib` (the path to a local `canvas-glide` checkout), and `npm install` restores the published version. The usual commands:

```sh
npm install
npm run check
npm test
npm run build
```

`npm run check` runs `svelte-check`. `npm test` runs the Vitest suite in `test/` in jsdom, with the 2D context, `createImageBitmap` and `ResizeObserver` stubbed. `npm run build` packages `src/lib` into `dist/` with `svelte-package` and checks the result with `publint`; `npm run build:demo` builds the demo into `demo-dist/`.

Publishing a GitHub release runs `.github/workflows/npm-publish.yml`: it checks, tests and builds the tag, sets `package.json` on the default branch to the release version, and stages the package on npm with trusted publishing; `npm stage approve` publishes it.

## License

MIT, see [LICENSE.md](LICENSE.md).
