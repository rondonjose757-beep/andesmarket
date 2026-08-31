import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = cargando, null = sin sesión
  const [customer, setCustomer] = useState(null)
  const [customerChecked, setCustomerChecked] = useState(false)
  const [authError, setAuthError] = useState(null)

  const loadCustomer = useCallback(async (userId) => {
    if (!userId) {
      setCustomer(null)
      setCustomerChecked(true)
      return
    }
    setCustomerChecked(false)
    const { data } = await supabase.from('customers').select('*').eq('auth_user_id', userId).maybeSingle()
    setCustomer(data ?? null)
    setCustomerChecked(true)
  }, [])

  useEffect(() => {
    async function bootstrap() {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setSession(data.session)
        loadCustomer(data.session.user.id)
        return
      }
      const { data: anonData, error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error('No se pudo crear la sesión anónima:', error.message)
        setAuthError(error.message)
        setSession(null)
        setCustomerChecked(true)
        return
      }
      setSession(anonData.session)
      loadCustomer(anonData.session.user.id)
    }
    bootstrap()

    const { data: subscriptionData } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      loadCustomer(nextSession?.user?.id)
    })

    return () => subscriptionData.subscription.unsubscribe()
  }, [loadCustomer])

  const saveProfile = useCallback(
    async ({ phone, name, address }) => {
      if (!session?.user?.id) throw new Error('Todavía no hay una sesión activa.')
      const { data, error } = await supabase
        .from('customers')
        .insert({
          auth_user_id: session.user.id,
          phone: phone.trim(),
          name: name.trim(),
          address: address?.trim() || null,
          profile_completed: true,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ese número de teléfono ya está registrado. Usa otro número.')
        }
        throw new Error('No se pudo guardar tu perfil. Intenta de nuevo.')
      }
      setCustomer(data)
      return data
    },
    [session],
  )

  const updateProfile = useCallback(
    async ({ phone, name, address }) => {
      if (!customer) throw new Error('Todavía no tienes un perfil creado.')
      const { data, error } = await supabase
        .from('customers')
        .update({ phone: phone.trim(), name: name.trim(), address: address?.trim() || null })
        .eq('id', customer.id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ese número de teléfono ya está registrado. Usa otro número.')
        }
        throw new Error('No se pudo actualizar tu perfil. Intenta de nuevo.')
      }
      setCustomer(data)
      return data
    },
    [customer],
  )

  const value = {
    isLoading: session === undefined || !customerChecked,
    user: session?.user ?? null,
    customer,
    authError,
    saveProfile,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
