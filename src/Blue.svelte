<script lang="typescript">
  import { fade } from 'svelte/transition'
  import type { AppRouter } from './routerStore'
  import type { RouteParams } from 'typescript-router'

  export let params: RouteParams<AppRouter, 'user'>
</script>

<div in:fade={{ duration: 120 }}>
  <h2>User #{params.id}</h2>
</div>

<style>
  div {
    background-color: #6666ff;
    color: white;
    width: var(--section-size);
    height: var(--section-size);
    padding: 8px;
  }
</style>
