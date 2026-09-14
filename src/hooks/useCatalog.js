import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCatalog() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select(
            'id, name, description, price, image_url, stock, discount_type, discount_value, category:categories(id, name, sort_order), subcategory:subcategories!products_subcategory_category_fkey(id, name, sort_order)',
          )
          .eq('active', true)
          .order('name')
        if (fetchError) throw fetchError
        if (!cancelled) setProducts(data ?? [])
      } catch {
        if (!cancelled) setError('No se pudo cargar el catálogo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  const categories = useMemo(() => {
    const map = new Map()
    for (const product of products) {
      if (product.category) map.set(product.category.id, product.category)
    }
    return Array.from(map.values()).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es'),
    )
  }, [products])

  return { products, categories, loading, error, retry }
}
