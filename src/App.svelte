<script lang="typescript">
  import Blue from './Blue.svelte'
  import Green from './Green.svelte'
  import Link from './Link.svelte'
  import Red from './Red.svelte'
  import { route as routeStore } from './routerStore'
  import type { UserId } from './user'

  const userId = '33' as UserId

  // https://github.com/sveltejs/language-tools/issues/493
  $: route = $routeStore
</script>

<div class="app">
  <h1>Routing example</h1>

  <nav>
    <Link route={['index', {}]}>Index</Link>
    <Link route={['users', { date: new Date().toISOString() }]}>Users</Link>
    <Link route={['user', { id: userId }]}>User</Link>
  </nav>

  <main>
    {#if route.name === 'index'}
      <Red />
    {:else if route.name === 'users'}
      <Green params={route.params} />
    {:else if route.name === 'user'}
      <Blue params={route.params} />
    {:else}
      <p>404</p>
    {/if}
  </main>
</div>

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

    --section-size: 200px;
  }
</style>
