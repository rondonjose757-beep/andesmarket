import test from 'node:test'
import assert from 'node:assert/strict'
import { optimizedProductImageUrl } from '../../src/lib/productImageUrl.js'

test('convierte una imagen pública de Supabase en una variante redimensionada', () => {
  const source =
    'https://ywtusdrduxsxwjeghrpu.supabase.co/storage/v1/object/public/products/catalogo/detergente.png'

  assert.equal(
    optimizedProductImageUrl(source, 256),
    'https://ywtusdrduxsxwjeghrpu.supabase.co/storage/v1/render/image/public/products/catalogo/detergente.png?width=256&quality=75&resize=contain',
  )
})

test('conserva sin cambios imágenes externas o embebidas', () => {
  assert.equal(optimizedProductImageUrl('https://images.example.com/producto.png', 256), 'https://images.example.com/producto.png')
  assert.equal(optimizedProductImageUrl('data:image/svg+xml,%3Csvg%3E', 256), 'data:image/svg+xml,%3Csvg%3E')
  assert.equal(optimizedProductImageUrl(null, 256), null)
})
