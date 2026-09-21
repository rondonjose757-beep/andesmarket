import { createClient } from 'npm:@supabase/supabase-js@2.112.4'
import { createAdminLoginHandler } from './handler.js'

// Cliente exclusivo servidor; nunca se comparte con AuthProvider ni se importa
// desde src/. No hay persistencia ni sustitución por una sesión del visitante.
Deno.serve(createAdminLoginHandler({
  config: () => ({
    hmacSecret: Deno.env.get('ADMIN_LOGIN_HMAC_SECRET'),
    trustedProxy: Deno.env.get('ADMIN_LOGIN_TRUSTED_PROXY'),
    deploymentId: Deno.env.get('DENO_DEPLOYMENT_ID'),
  }),
  createBackend: () => {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) throw new Error('Configuración no disponible.')
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
      },
    })
  },
}))
