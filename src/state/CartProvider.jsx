import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(undefined)
const STORAGE_KEY = 'andesmarket.cart.v1'

function readInitialCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readInitialCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // almacenamiento no disponible (modo privado, etc.) — el carrito sigue funcionando en memoria
    }
  }, [items])

  const addItem = useCallback((product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.productId)
      if (existing) {
        return current.map((item) =>
          item.productId === product.productId ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [...current, { ...product, quantity }]
    })
  }, [])

  const removeItem = useCallback((productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId))
  }, [])

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) {
      setItems((current) => current.filter((item) => item.productId !== productId))
      return
    }
    setItems((current) => current.map((item) => (item.productId === productId ? { ...item, quantity } : item)))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const grandTotal = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items])

  const value = { items, itemCount, grandTotal, addItem, removeItem, updateQuantity, clearCart }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
