# How to do client-side routing in a typesafe manner when using TypeScript

Requirements:
1) We shouldn't be able to push/replace the history with a wrong route name and params combination
2) The router gives back a route union that can be discriminated on its name, allowing the use of its params in a type safe manner
3) creating links should take the params required for that route, but converted to serializable url values (string, number, etc)

This example uses svelte and its store but the router is framework/library agnostic.
