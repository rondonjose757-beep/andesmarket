import { useCallback, useEffect, useRef, useState } from 'react'
import { adminClient, clearAdminSession } from '../lib/adminSupabaseClient'
import { ADMIN_BLOCKED, ADMIN_LOGIN_ERROR, loginAdmin, operatorAccess } from '../lib/adminAccess'
import { AdminAuthContext } from './AdminAuthContext'

export default function AdminAuthProvider({ children }) {
  const [access, setAccess] = useState({ status: 'checking', operator: null })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  const alive = useRef(true)
  const acting = useRef(false)

  const refresh = useCallback(async () => {
    const version = ++generation.current
    const current = () => alive.current && generation.current === version
    setAccess({ status: 'checking', operator: null })
    try {
      const { data: stored, error: sessionError } = await adminClient.auth.getSession()
      if (!current()) return
      if (sessionError) throw new Error('Sesión no disponible')
      if (!stored.session) { setAccess({ status: 'signed-out', operator: null }); return }
      const { data: verified, error: userError } = await adminClient.auth.getUser()
      if (!current()) return
      if (userError) throw new Error('Sesión no verificable')
      let operator = null
      if (verified.user?.is_anonymous === false) {
        const { data, error } = await adminClient.from('admin_operators')
          .select('id,auth_user_id,display_name,active,must_change_pin')
          .eq('auth_user_id', verified.user.id).maybeSingle().retry(false)
        if (!current()) return
        if (error) throw new Error('Operador no verificable')
        operator = data
      }
      const status = operatorAccess(verified.user, operator)
      if (status === 'denied') {
        await clearAdminSession()
        if (current()) {
          setMessage(ADMIN_LOGIN_ERROR)
          setAccess({ status: 'signed-out', operator: null })
        }
      } else if (current()) setAccess({ status, operator })
    } catch {
      if (current()) setAccess({ status: 'error', operator: null })
    }
  }, [])

  useEffect(() => {
    alive.current = true
    const revision = generation
    let timer
    const schedule = () => {
      if (acting.current) return
      clearTimeout(timer)
      // No llamadas Supabase dentro del callback Auth; releer la sesión de ESTA
      // pestaña, no adoptar sesiones recibidas vía BroadcastChannel de otra.
      timer = setTimeout(() => { void refresh() }, 0)
    }
    const { data } = adminClient.auth.onAuthStateChange(schedule)
    schedule()
    window.addEventListener('focus', schedule)
    return () => {
      alive.current = false
      revision.current++
      clearTimeout(timer)
      data.subscription.unsubscribe()
      window.removeEventListener('focus', schedule)
    }
  }, [refresh])

  async function login(nombre, pin) {
    if (acting.current) return
    acting.current = true
    setBusy(true)
    setMessage('')
    try {
      const result = await loginAdmin({ client: adminClient, nombre, pin })
      if (!alive.current) { await clearAdminSession(); return }
      if (!result.ok) { setMessage(result.blocked ? ADMIN_BLOCKED : ADMIN_LOGIN_ERROR); return }
      await adminClient.auth.startAutoRefresh()
      await refresh()
    } catch {
      if (alive.current) setMessage(ADMIN_LOGIN_ERROR)
    } finally { acting.current = false; if (alive.current) setBusy(false) }
  }

  async function logout() {
    if (acting.current) return
    acting.current = true
    generation.current++
    setBusy(true)
    setAccess({ status: 'checking', operator: null })
    try { await clearAdminSession(); setMessage('') }
    catch { setMessage('No se pudo limpiar la sesión. Cierra esta pestaña.') }
    finally {
      acting.current = false
      if (alive.current) { setAccess({ status: 'signed-out', operator: null }); setBusy(false) }
    }
  }

  async function changePin(currentPin, newPin) {
    if (acting.current) return ''
    acting.current = true
    setBusy(true)
    try {
      const { data, error } = await adminClient.rpc('change_admin_pin', { current_pin: currentPin, new_pin: newPin })
      if (error) return 'No se pudo confirmar el cambio. Comprueba tu conexión antes de reintentar.'
      if (data?.success === true && data.outcome === 'ok') { await refresh(); return '' }
      if (data?.outcome === 'rate_limited') return ADMIN_BLOCKED
      if (data?.outcome === 'invalid_new_pin') return 'Elige un PIN de cuatro dígitos distinto al actual y al temporal.'
      return 'No se pudo cambiar el PIN. Revisa el PIN actual e intenta de nuevo.'
    } catch { return 'No se pudo confirmar el cambio. Comprueba tu conexión antes de reintentar.' }
    finally { acting.current = false; if (alive.current) setBusy(false) }
  }

  return <AdminAuthContext.Provider value={{ ...access, message, busy, login, logout, changePin, refresh }}>
    {children}
  </AdminAuthContext.Provider>
}
