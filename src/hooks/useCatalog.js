import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCatalog() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, stock, discount_type, discount_value, category:categories(id, name)')
        .eq('active', true)
        .order('name')

      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setProducts(data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const map = new Map()
    for (const product of products) {
      if (product.category) map.set(product.category.id, product.category)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  return { products, categories, loading, error }
}
