import Mustache from 'mustache'
import { store } from './store'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

type Route = {
  [key in Method]?: (req: Request) => Promise<Response>
}

type BifrostProxiedRoute = {
  url: string
  headers: Record<string, string>
  body: Record<string, string>
  method?: Method
}

type BifrostRoute = {
  authorization: string
  routes: BifrostProxiedRoute[]
}

type RouteResponse = {
  status: number
  body?: string | Record<string, unknown>
  error?: string
}

const { get, set, del } = await store<BifrostRoute>('routes')

const routes: Record<string, Route> = {
  '/': {
    GET: async () =>
      await new Response(
        `Bifrost - <a href="https://github.com/nunogois/bifrost">GitHub</a>`,
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8'
          }
        }
      )
  },
  '/bifrost': {
    GET: async (req: Request) => {
      const bifrostRoute = get(key(req))
      if (!bifrostRoute) return e404()

      return Response.json(bifrostRoute)
    },
    POST: async (req: Request) => {
      const bifrostRoute = get(key(req))
      if (bifrostRoute) return e409()

      const jsonBody = await req.json()
      set(key(req), jsonBody)
      return Response.json(jsonBody)
    },
    PUT: async (req: Request) => {
      const bifrostRoute = get(key(req))
      if (!bifrostRoute) return e404()

      const jsonBody = await req.json()
      set(key(req), jsonBody)
      return Response.json(jsonBody)
    },
    DELETE: async (req: Request) => {
      const bifrostRoute = get(key(req))
      if (!bifrostRoute) return e404()

      return Response.json(del(key(req)))
    }
  }
}

const getResponseBody = (response: Response) => {
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) return response.json()
  return response.text()
}

const mustacheRender = async (
  values: string[],
  context: any
): Promise<string[]> => {
  Mustache.tags = ['<%', '%>']
  Mustache.escape = (text: string) => text
  return values.filter(Boolean).map(value => Mustache.render(value, context))
}

const getToken = (req: Request) => req.headers.get('Authorization')

const getBifrostRouteInfo = (req: Request) => {
  const pathname = new URL(req.url).pathname.split('/bifrost/')[1]
  const method = pathname.split('/')[0]
  const url = pathname.split(`${method}/`)[1]
  return { method, url }
}

const buildKey = (method: string, url: string) =>
  `${method.toUpperCase()}::${url}`

const key = (req: Request) => {
  const { method, url } = getBifrostRouteInfo(req)
  return buildKey(method, url)
}

const e404 = () => new Response('Not found', { status: 404 })
const e401 = () => new Response('Unauthorized', { status: 401 })
const e409 = () => new Response('Conflict', { status: 409 })

export const router = async (req: Request) => {
  const { method, url } = req
  const pathname = new URL(url).pathname
  const endpoint = `/${pathname.split('/')[1]}`

  const token = getToken(req)

  const route = get(buildKey(method, pathname.slice(1)))
  if (route) {
    if (route.authorization && route.authorization !== token) return e401()

    let payload = {}
    try {
      payload = await req.json()
    } catch (_) {}

    const status = new Map<string, RouteResponse>()
    for (const {
      url: templateUrl,
      method = 'GET',
      headers: templateHeaders,
      body: templateBody
    } of route.routes) {
      const [url, headers, body] = await mustacheRender(
        [
          templateUrl,
          JSON.stringify(templateHeaders),
          JSON.stringify(templateBody)
        ],
        payload
      )

      const key = buildKey(method, url)

      try {
        const response = await fetch(url, {
          method,
          headers: headers ? JSON.parse(headers) : undefined,
          body
        })

        const responseBody = await getResponseBody(response)
        if (response.ok)
          status.set(key, { status: response.status, body: responseBody })
        else
          status.set(key, {
            status: response.status,
            error: response.statusText,
            body: responseBody
          })
      } catch (error: any) {
        status.set(key, { status: 500, error: error.message })
      }
    }
    const statusResponse = Object.fromEntries(status)
    return Response.json(statusResponse, {
      status: Object.values(statusResponse).some(({ error }) => error)
        ? 502
        : 200
    })
  }

  return routes[endpoint]?.[method as Method]?.(req) || e404()
}
