<script lang="typescript">
  import { fade } from 'svelte/transition'
  import type { AppRouter } from './routerStore'
  import type { RouteParams } from 'typescript-router'

  export let params: RouteParams<AppRouter, 'users'>
</script>

<div in:fade={{ duration: 120 }}>
  <h2>Users</h2>

  <p>{params.date.toDateString()}</p>
</div>

<style>
  div {
    background-color: #66ff66;
    color: white;
    width: var(--section-size);
    height: var(--section-size);
    padding: 8px;
  }
</style>
