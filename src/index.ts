import { router } from './router'

const server = Bun.serve({
  fetch: router
})

console.log(`Bifrost - Listening on http://localhost:${server.port}`)
