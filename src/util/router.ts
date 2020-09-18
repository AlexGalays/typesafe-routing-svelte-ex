import {
  Validator,
  AnyValidator,
  ObjectOf,
  object,
  errorDebugString,
} from 'validation.ts'

// A simple, History-based typesafe router. The complexity is only found in the type correctness.
// matching only occurs on the path portion of the url but query strings are passed along (though multivalued query params aren't supported)

interface Router<ROUTES extends RouteDefinition<string, unknown>[]> {
  readonly definitions: ROUTES

  readonly route: RouteUnionFromDefinitions<RoutesWithNotFound<ROUTES>>
  readonly onChange: (callback: () => void) => Unsubscribe

  readonly push: <NAME extends ROUTES[number]['name']>(
    routeName: NAME,
    params: SerializableValues<
      RouteByName<NAME, ROUTES[number]>['validator']['T']
    >
  ) => void
  readonly replace: <NAME extends ROUTES[number]['name']>(
    routeName: NAME,
    params: SerializableValues<
      RouteByName<NAME, ROUTES[number]>['validator']['T']
    >
  ) => void
  readonly link: <NAME extends ROUTES[number]['name']>(
    routeName: NAME,
    params: SerializableValues<
      RouteByName<NAME, ROUTES[number]>['validator']['T']
    >
  ) => string
}

export function Route<
  NAME extends string,
  PARAMS extends Record<string, AnyValidator>
>(
  name: NAME,
  path: string,
  params?: PARAMS
): RouteDefinition<RouteNameLiteral<NAME>, ObjectOf<PARAMS>> {
  return { name, path, validator: object(params || ({} as PARAMS)) }
}

export function Router<
  FIRSTROUTE extends RouteDefinition<string, {}>,
  OTHERROUTES extends RouteDefinition<string, {}>[]
>(
  definitions: [route0: FIRSTROUTE, ...routes: OTHERROUTES],
  options: Options
): Router<[FIRSTROUTE, ...OTHERROUTES]> {
  const routes = definitions.reduce((acc, def) => {
    acc[def.name] = { ...def, ...pathInfos(def.path) }
    return acc
  }, {} as Record<string, ParsedRouteDefinition<string, {}>>)

  const notFound = { name: 'notFound', params: {} }

  let subs: Function[] = []
  let _route = notFound

  setRouteFromHistory()
  addEventListener('popstate', setRouteFromHistory)

  function setRouteFromHistory() {
    const path = location.pathname
    const search = location.search

    for (const parsedRoute of Object.values(routes)) {
      const match = parsedRoute.pattern.exec(path)
      if (!match) continue

      const stringParams = parsedRoute.keys.reduce<Record<string, string>>(
        (params, key, index) => {
          params[key] = match[index + 1]
          return params
        },
        parseQueryParams(search.slice(1))
      )

      const validatedParams = parsedRoute.validator.validate(stringParams)

      if (validatedParams.type === 'error') {
        return onRouteNotFound(
          'route match but params error. ' +
            errorDebugString(validatedParams.errors)
        )
      }

      return (_route = {
        name: parsedRoute.name,
        params: validatedParams.value,
      })
    }

    onRouteNotFound('No match found')
  }

  const PARAMS = /:[^\\?\/]*/g
  function link(routeName: string, params: Record<string, string>) {
    const routeToLink = routes[routeName]
    const path = routeToLink.path.replace(PARAMS, (p) =>
      encodeURIComponent(params[p.substring(1)])
    )
    const query = Object.keys(params)
      .filter((p) => !routeToLink.keys.includes(p))
      .map((p) => `${p}=${encodeURIComponent(params[p])}`)
      .join('&')
    return path + (query.length ? `?${query}` : '')
  }

  const push = changeRoute(false)
  const replace = changeRoute(true)

  function changeRoute(replace: boolean) {
    return (routeName: string, params: Record<string, any>) => {
      const uri = link(routeName, params)

      if (replace) history.replaceState(uri, '', uri)
      else history.pushState(uri, '', uri)

      _route = {
        name: routeName,
        params,
      }

      fireOnChange()
    }
  }

  function onChange(callback: () => void) {
    subs.push(callback)
    return () => {
      subs.splice(subs.indexOf(callback), 1)
    }
  }

  function fireOnChange() {
    subs.forEach((fn) => fn())
  }

  function onRouteNotFound(reason: string) {
    // Set the route to notFound first, in case the onNotFound callback ends up redirecting to some other routes instead.
    _route = notFound
    options.onNotFound(reason)
    // if no redirect occured then fire onChange, otherwise it already fired from push/replace.
    if (_route.name === 'notFound') fireOnChange()
  }

  return ({
    get route() {
      return _route
    },
    definitions,
    onChange,
    push,
    replace,
    link,
  } as any) as Router<[FIRSTROUTE, ...OTHERROUTES]>
}

// Extracts a simple chain like /path/:id to a regexp and the list of path keys it found.
function pathInfos(str: string) {
  let tmp,
    keys = [],
    pattern = '',
    arr = str.split('/')

  arr[0] || arr.shift()

  while ((tmp = arr.shift())) {
    if (tmp[0] === ':') {
      keys.push(tmp.substring(1))
      pattern += '/([^/]+?)'
    } else {
      pattern += '/' + tmp
    }
  }

  return {
    keys,
    pattern: new RegExp('^' + pattern + '/?$', 'i'),
  }
}

function parseQueryParams(query: string) {
  if (!query) return {}

  return query.split('&').reduce<Record<string, string>>((res, paramValue) => {
    const [param, value] = paramValue.split('=')
    res[param] = decodeURIComponent(value)
    return res
  }, {})
}

// A route as defined during router initialization.
interface RouteDefinition<NAME, PARAMS> {
  name: NAME
  path: string
  validator: Validator<PARAMS>
}

interface ParsedRouteDefinition<NAME, PARAMS>
  extends RouteDefinition<NAME, PARAMS> {
  keys: string[]
  pattern: RegExp
}

interface CurrentRoute<NAME, PARAMS> {
  name: NAME
  params: PARAMS
}

interface Options {
  onNotFound: (reason: string) => void
}

// Transforms a widened string into its string literal.
type RouteNameLiteral<NAME extends string> = { [k in NAME]: k }[NAME]

type RouteByName<
  NAME extends string,
  ROUTES extends RouteDefinition<string, unknown>
> = ROUTES extends { name: NAME } ? ROUTES : never

type RouteUnionFromDefinitions<
  ROUTES extends RouteDefinition<string, unknown>[]
> = {
  [i in keyof ROUTES]: ROUTES[i] extends ROUTES[number]
    ? CurrentRouteFromDefinition<ROUTES[i]>
    : never
}[number]

type CurrentRouteFromDefinition<
  ROUTE extends RouteDefinition<string, unknown>
> = CurrentRoute<ROUTE['name'], ROUTE['validator']['T']>

type Unsubscribe = () => void

type RoutesWithNotFound<ROUTES extends RouteDefinition<string, unknown>[]> = [
  ...ROUTES,
  { name: 'notFound'; path: ''; validator: Validator<{}> }
]

type OptionalKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never
}[keyof T]

type MandatoryKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? never : K
}[keyof T]

type SerializableValues<T> = {
  [K in MandatoryKeys<T>]: T[K] extends number | string ? T[K] : string
} &
  { [K in OptionalKeys<T>]?: T[K] extends number | string ? T[K] : string }

export type RouteParams<
  ROUTER extends Router<any>,
  NAME extends string
> = RouteByName<NAME, ROUTER['definitions'][number]>['validator']['T']


type RouteAndParamsTemp<ROUTER extends Router<any>> = RouteAndParamsTemp2<
  ROUTER['definitions']
>

type RouteAndParamsTemp2<ROUTES extends RouteDefinition<string, unknown>[]> = {
  [i in keyof ROUTES]: ROUTES[i] extends ROUTES[number]
    ? RouteAndParamTuple<ROUTES[i]['name'], ROUTES[i]['validator']['T']>
    : never
}

type RouteAndParamTuple<NAME, PARAMS> = PARAMS extends {}
  ? {} extends PARAMS
    ? [NAME]
    : [NAME, PARAMS]
  : [NAME, PARAMS]

// The union of all valid route name + params tuples that could be passed as arguments to push/replace/link
export type RouteAndParams<ROUTER extends Router<any>> = RouteAndParamsTemp<
  ROUTER
>[number]