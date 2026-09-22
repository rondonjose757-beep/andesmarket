import { createClient } from '@supabase/supabase-js'

export const ADMIN_STORAGE_KEY = 'sb-andesmarket-admin-auth'
export const adminSupabaseUrl = import.meta.env.VITE_SUPABASE_URL

// Acceso diferido; si sessionStorage no está disponible no se usa localStorage.
const storage = {
  getItem: (key) => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: (key) => window.sessionStorage.removeItem(key),
}

export const adminClient = createClient(adminSupabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { storage, storageKey: ADMIN_STORAGE_KEY, persistSession: true,
    autoRefreshToken: true, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, {
    ...init, cache: 'no-store', signal: init?.signal ?? AbortSignal.timeout(20000),
  }) },
})

export async function clearAdminSession() {
  try {
    // Nunca scope global: no cierra otras sesiones del operador.
    await adminClient.auth.signOut({ scope: 'local' })
  } catch {
    // El cierre local sigue siendo posible sin red. Sin logs de errores Auth.
  } finally {
    await adminClient.auth.stopAutoRefresh()
    storage.removeItem(ADMIN_STORAGE_KEY)
    storage.removeItem(`${ADMIN_STORAGE_KEY}-user`)
    storage.removeItem(`${ADMIN_STORAGE_KEY}-code-verifier`)
  }
}
