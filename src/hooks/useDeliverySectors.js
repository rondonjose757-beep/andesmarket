import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useDeliverySectors() {
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    async function loadSectors() {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('delivery_sectors')
        .select('id, name, delivery_fee')
        .eq('active', true)
        .order('sort_order')
        .order('name')

      if (cancelled) return
      if (queryError) {
        setSectors([])
        setError('No pudimos cargar los sectores de entrega. Intenta de nuevo.')
      } else {
        setSectors(data ?? [])
      }
      setLoading(false)
    }
    loadSectors()
    return () => {
      cancelled = true
    }
  }, [attempt])

  return { sectors, loading, error, retry }
}
