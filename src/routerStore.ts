import { Route, Router } from './util/router'
import { readable, writable } from 'svelte/store'
import { userId } from './user'

export const router = Router(
  [
    Route('index', '/'),
    Route('users', '/users'),
    Route('user', '/users/:id', { id: userId }),
  ],
  { onNotFound }
)

export type AppRouter = typeof router

export const route = readable(router.route, (set) => {
  const stop = router.onChange(() => set(router.route))
  return stop
})

function onNotFound(reason: string) {
  console.error(reason)
}



type SimpleRoute = {name: 'routeA', params: {}} | {name: 'routeB', params: {id: string}} 

export const simpleRoute = writable<SimpleRoute>({name: 'routeA', params: {}})