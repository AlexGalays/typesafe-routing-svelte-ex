<script lang="typescript">
  import { router } from './routerStore'
  import type { AppRouter } from './routerStore'
  import type { RouteAndParams } from './util/router'

  export let extraClassNames: string | undefined = undefined

  // Not passing a route will deactivate the link.
  // This can be useful when the Link is the parent of many elements and it's not feasible to just rearrange the Element hierarchy.
  export let route: RouteAndParams<AppRouter> | undefined = undefined
  export let replace: boolean = false

  $: href = route ? router.link(route[0], route[1]) : undefined

  let preventClickDefault = false

  function onMouseDown(evt: DOM.MouseEvent<HTMLAnchorElement>) {
    if (!route) return

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
  .active {
    cursor: pointer;
  }
</style>

<a
  class={extraClassNames}
  class:active={Boolean(href)}
  {href}
  on:mousedown={onMouseDown}
  on:click={onClick}>
  <slot />
</a>
