<script lang="typescript">
  import type { text } from 'svelte/internal'
  import Link from './Link.svelte'
  import { router, route, simpleRoute } from './routerStore'
  import type { UserId } from './user'

  const userId = '33' as UserId

  // https://github.com/sveltejs/language-tools/issues/493
  $: currentRoute = $route
</script>

<style>
  .app {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  nav {
    display: flex;
    justify-content: space-evenly;
    gap: 20px;
    max-width: 300px;
  }

  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }
</style>

<div class="app">
  <h1>Routing example</h1>

  <nav>
    <Link text="Index" route={['index']} />
    <Link text="Users" route={['users']} />
    <Link text="User" route={['user', { id: userId }]} />
  </nav>

  <main>
    {#if currentRoute.name === 'index'}
      <p>Index</p>
    {:else if currentRoute.name === 'users'}
      <p>Users</p>
    {:else if currentRoute.name === 'user'}
      <p>User #{currentRoute.params.id}</p>
    {/if}
  </main>
</div>
