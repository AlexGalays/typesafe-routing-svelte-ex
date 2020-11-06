import { Route, Router } from './util/router'
import { derived, readable } from 'svelte/store'
import { userId } from './user'
import { object } from 'idonttrustlikethat'

export const router = Router(
  {
    index: Route('/'),
    users: Route('/users'),
    user: Route('/users/:id', object({ id: userId })),
  },
  { onNotFound }
)

export type AppRouter = typeof router

export const route = readable(router.route, set => {
  const stop = router.onChange(() => set(router.route))
  return stop
})

export const currentRoute = derived(route, r =>
  r.name === 'notFound' ? undefined : r
)

function onNotFound(reason: string) {
  console.error(reason)
}
