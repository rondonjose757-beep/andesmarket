import { isIP } from 'node:net'

const ALLOWED_ORIGINS = new Set(['https://andesmarket.app', 'http://localhost:5173'])
const LOGIN_ERROR = 'No se pudo iniciar sesión.'
const MAX_BODY_BYTES = 1024

function response(status, body = { error: LOGIN_ERROR }, extra = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff', ...extra },
  })
}

function validIp(value) {
  const ip = value?.trim()
  return Boolean(ip && !ip.includes(',') && !ip.includes('%') && isIP(ip))
}

export function createAdminLoginProxy({ supabaseUrl, proxySecret, fetcher = fetch }) {
  return async function adminLoginProxy(request) {
    const origin = request.headers.get('origin')
    if (!origin || !ALLOWED_ORIGINS.has(origin) || request.method !== 'POST') return response(403)
    const clientIp = request.headers.get('x-vercel-forwarded-for')
    if (!validIp(clientIp) || typeof supabaseUrl !== 'string' || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)
      || typeof proxySecret !== 'string' || !/^[a-f0-9]{64}$/i.test(proxySecret)) return response(403)
    let body
    try {
      body = await request.text()
      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return response(413, { error: 'Solicitud inválida.' })
    } catch { return response(400, { error: 'Solicitud inválida.' }) }
    try {
      const upstream = await fetcher(`${supabaseUrl}/functions/v1/admin-login`, {
        method: 'POST', body,
        headers: {
          origin,
          'content-type': request.headers.get('content-type') || '',
          'x-admin-client-ip': clientIp.trim(),
          'x-admin-login-proxy': proxySecret,
        },
        redirect: 'error', signal: AbortSignal.timeout(20000),
      })
      const safeStatus = [200, 400, 401, 408, 413, 415, 429, 503].includes(upstream.status) ? upstream.status : 503
      const upstreamBody = await upstream.text()
      const retryAfter = safeStatus === 429 ? upstream.headers.get('retry-after') : null
      return new Response(upstreamBody || JSON.stringify({ error: LOGIN_ERROR }), { status: safeStatus, headers: {
        'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff',
        ...(retryAfter ? { 'Retry-After': retryAfter } : {}),
      } })
    } catch { return response(503) }
  }
}

async function nodeRequest(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw new Error('body_too_large')
    chunks.push(chunk)
  }
  return new Request(`https://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined, duplex: 'half' })
}

export default async function handler(req, res) {
  let result
  try {
    const request = await nodeRequest(req)
    result = await createAdminLoginProxy({ supabaseUrl: process.env.SUPABASE_URL, proxySecret: process.env.ADMIN_LOGIN_PROXY_SECRET })(request)
  } catch { result = response(413, { error: 'Solicitud inválida.' }) }
  res.statusCode = result.status
  result.headers.forEach((value, name) => res.setHeader(name, value))
  res.end(Buffer.from(await result.arrayBuffer()))
}
