<script lang="ts">
  import './App.css';
  import { Glide, GlideCanvas, Renderer } from './lib';
  import { createLocalStorageBlob } from './showcase/localStorageBlob.svelte';

  type Tab = (typeof Tab)[keyof typeof Tab];
  const Tab = Object.freeze({
    Canvas: 'canvas',
    Img: 'img',
    Html: 'html',
  } as const);
  const TabValues: Tab[] = Object.values(Tab);

  const TabRendererMap: Record<Tab, Renderer> = {
    [Tab.Canvas]: Renderer.Canvas,
    [Tab.Img]: Renderer.Image,
    [Tab.Html]: Renderer.Html,
  };

  const TabLabel: Record<Tab, string> = {
    [Tab.Canvas]: 'Canvas',
    [Tab.Img]: 'Image',
    [Tab.Html]: 'html',
  };

  type Theme = (typeof Theme)[keyof typeof Theme];
  const Theme = Object.freeze({
    Light: 'light',
    Dark: 'dark',
    Auto: 'auto',
  } as const);

  const themeOptions: { value: Theme; label: string }[] = [
    { value: Theme.Auto, label: 'Auto' },
    { value: Theme.Light, label: 'Light' },
    { value: Theme.Dark, label: 'Dark' },
  ];

  function getInitialTheme(): Theme {
    const saved = localStorage.getItem('theme');
    if (saved === Theme.Light || saved === Theme.Dark || saved === Theme.Auto) return saved;
    return Theme.Auto;
  }

  let tab = $state<Tab>(Tab.Canvas);
  let theme = $state<Theme>(getInitialTheme());
  let themeOpen = $state(false);
  let uploadEl = $state<HTMLInputElement>();
  const glide = new Glide();

  const file = createLocalStorageBlob<File | null>('file', null);

  $effect(() => {
    if (theme === Theme.Auto) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  });
</script>

{#snippet themeIcon(value: Theme)}
  {#if value === Theme.Light}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  {:else if value === Theme.Dark}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  {/if}
{/snippet}

<div class="toolbar toolbar--tabs">
  {#each TabValues as t (t)}
    <button class="tab{t === tab ? ' tab--active' : ''}" onclick={() => (tab = t)}>
      {TabLabel[t]}
    </button>
  {/each}
</div>

<div class="toolbar-row">
  <div class="toolbar toolbar--controls">
    <button class="icon-btn" title="Zoom in" onclick={() => glide.zoomIn()}>+</button>
    <button class="icon-btn" title="Zoom out" onclick={() => glide.zoomOut()}>−</button>
    <span class="divider"></span>
    <button onclick={() => glide.center()}>Center</button>
    <button onclick={() => glide.fit()}>Fit</button>
    <span class="divider"></span>
    <label class="upload-btn">
      Upload
      <input
        bind:this={uploadEl}
        type="file"
        accept="image/*"
        onchange={(e) => file.set(e.currentTarget.files?.[0] ?? null)}
      />
    </label>
    <button
      onclick={() => {
        if (uploadEl) uploadEl.value = '';
        file.set(null);
      }}
    >
      ✕
    </button>
  </div>

  <div class="toolbar toolbar--theme">
    <div class="dropdown">
      <button
        class="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={themeOpen}
        onclick={() => (themeOpen = !themeOpen)}
      >
        <span class="dropdown-value">
          {@render themeIcon(theme)}
          <span class="dropdown-label">{themeOptions.find((o) => o.value === theme)?.label}</span>
        </span>
        <svg
          class="dropdown-caret"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {#if themeOpen}
        <ul class="dropdown-menu" role="listbox">
          {#each themeOptions as opt (opt.value)}
            <li role="none">
              <button
                role="option"
                aria-selected={theme === opt.value}
                class="dropdown-item{theme === opt.value ? ' dropdown-item--active' : ''}"
                onclick={() => {
                  theme = opt.value;
                  themeOpen = false;
                }}
              >
                {@render themeIcon(opt.value)}
                {opt.label}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<div style="width: 100dvw; height: 100dvh; overflow: hidden">
  <GlideCanvas {glide} renderer={TabRendererMap[tab]} image={file.current} />
</div>
