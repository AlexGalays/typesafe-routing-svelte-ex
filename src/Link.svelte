<script lang="typescript">
  import { router } from './routerStore'
  import type { AppRouter } from './routerStore'
  import type { RouteAndParams } from './util/router'

  export let route: RouteAndParams<AppRouter>
  export let replace: boolean = false

  $: href = router.link(route[0], route[1])

  let preventClickDefault = false

  function onMouseDown(evt: DOM.MouseEvent<HTMLAnchorElement>) {
    const isModifiedEvent = Boolean(
      evt.metaKey || evt.altKey || evt.ctrlKey || evt.shiftKey
    )
    const isSelfTarget =
      !evt.target ||
      !evt.currentTarget.target ||
      evt.currentTarget.target === '_self'

    if (
      isSelfTarget && // Ignore everything but links with target self
      evt.button === 0 && // ignore everything but left clicks
      !isModifiedEvent // ignore clicks with modifier keys
    ) {
      preventClickDefault = true

      if (replace) router.replace(route[0], route[1])
      else router.push(route[0], route[1])
    }
  }

  function onClick(evt: DOM.MouseEvent<HTMLAnchorElement>) {
    if (preventClickDefault) {
      preventClickDefault = false
      evt.preventDefault()
    }
  }
</script>

<style>
  a {
    cursor: pointer;
  }
</style>

<a {href} on:mousedown={onMouseDown} on:click={onClick}>
  <slot />
</a>
