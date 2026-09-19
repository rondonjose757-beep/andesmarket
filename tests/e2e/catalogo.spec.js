import { test, expect } from '@playwright/test'

const image =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="30" y="10" width="40" height="80" rx="5" fill="green" /></svg>',
  )
const dairy = { id: 'c1', name: 'Lácteos', sort_order: 2 }
const pantry = { id: 'c2', name: 'Despensa', sort_order: 1 }
const products = [
  {
    id: 'p1',
    name: 'Leche completa 1 L',
    description: 'Leche completa. Mantener refrigerada después de abrir.',
    price: 3,
    discount_type: 'porcentaje',
    discount_value: 20,
    stock: 10,
    image_url: image,
    category: dairy,
    subcategory: { id: 's1', name: 'Leches', sort_order: 1 },
  },
  {
    id: 'p2',
    name: 'Arroz blanco premium de grano largo 1 kg',
    price: 2,
    stock: 0,
    image_url: image,
    category: pantry,
    subcategory: null,
  },
  {
    id: 'p3',
    name: 'Aceite de girasol 1 L',
    price: 5.5,
    stock: 10,
    image_url: image,
    category: pantry,
    subcategory: null,
  },
  {
    id: 'p4',
    name: 'Café molido 250 g',
    price: 4,
    stock: 10,
    image_url: null,
    category: { id: 'c3', name: 'Café y desayuno', sort_order: 3 },
    subcategory: null,
  },
  {
    id: 'p5',
    name: 'Yogur natural con frutas 500 g',
    price: 2.8,
    stock: 10,
    image_url: 'https://fixture.invalid/broken.png',
    category: dairy,
    subcategory: { id: 's2', name: 'Yogures', sort_order: 2 },
  },
  {
    id: 'p6',
    name: 'Agua mineral 1.5 L',
    price: 1,
    stock: 10,
    image_url: image,
    category: { id: 'c4', name: 'Bebidas', sort_order: 4 },
    subcategory: null,
  },
]

test.beforeEach(async ({ context }) => {
  // Toda comunicación con Supabase se intercepta; no se crean sesiones ni pedidos reales.
  await context.route('https://andesmarket-test.supabase.co/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/rest/v1/products') {
      return route.fulfill({ json: products })
    }
    if (url.pathname.startsWith('/auth/')) {
      return route.fulfill({ status: 400, json: { msg: 'Autenticación desactivada en pruebas' } })
    }
    return route.fulfill({ status: 403, json: { message: 'Escritura bloqueada en pruebas' } })
  })
  await context.route('https://fixture.invalid/**', (route) => route.fulfill({ status: 404, body: '' }))
})

const categoryButtons = (page) => page.getByRole('navigation', { name: 'Categorías', exact: true })
const subcategoryButtons = (page) => page.getByRole('navigation', { name: 'Subcategorías', exact: true })

test('iOS recibe la barra de estado integrada desde el HTML inicial', async ({ request }) => {
  const response = await request.get('/')
  const html = await response.text()
  expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"')
})

test('Safari recibe el lienzo verde y la app conserva el fondo crema', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(58, 154, 92)')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(58, 154, 92)')
  await expect(page.locator('html')).not.toHaveCSS('background-image', 'none')
  await expect(page.locator('body')).not.toHaveCSS('background-image', 'none')
  await expect(page.locator('#root')).toHaveCSS('background-color', 'rgb(243, 245, 241)')
})

test('la política de privacidad es pública y accesible desde el pie', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'andesmarket.cart.v1',
      JSON.stringify([{ productId: 'p1', name: 'Leche completa 1 L', unitPrice: 3, quantity: 1 }]),
    )
  })
  await page.goto('/')
  await page.getByRole('link', { name: 'Política de privacidad', exact: true }).click()

  await expect(page).toHaveURL('/privacidad')
  await expect(page.getByRole('heading', { name: 'Política de privacidad', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: '0412-2636533', exact: true })).toHaveAttribute('href', 'tel:+584122636533')
  await expect(page.getByRole('link', { name: 'rondon.jose.757@gmail.com', exact: true })).toHaveAttribute(
    'href',
    'mailto:rondon.jose.757@gmail.com',
  )
  await expect(page.locator('div.fixed.inset-x-0.bottom-0')).toHaveCount(0)
})

test('el buscador solo aparece en Inicio', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('search')).toHaveCount(1)

  for (const path of ['/catalogo', '/carrito', '/privacidad']) {
    await page.goto(path)
    await expect(page.getByRole('search')).toHaveCount(0)
  }
})

test('la cabecera compacta conserva la esquina inferior derecha redondeada', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, 500))
  const compacta = page.locator('div.fixed').filter({ has: page.getByRole('link', { name: 'AndesMarket, ir al inicio' }) })
  await expect(compacta).toHaveCSS('border-bottom-right-radius', '32px')
})

test('la cabecera principal permanece accesible al hacer scroll', async ({ page }) => {
  const linkEstaEnPantalla = (nombre) =>
    page.getByRole('link', { name: nombre, exact: true }).evaluateAll((links) =>
      links.some((link) => {
        const rect = link.getBoundingClientRect()
        return rect.bottom > 0 && rect.top < window.innerHeight
      }),
    )

  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect.poll(() => linkEstaEnPantalla('AndesMarket, ir al inicio')).toBe(true)

  await page.goto('/catalogo')
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect.poll(() => linkEstaEnPantalla('Volver al inicio')).toBe(true)
})

test('el menú reemplaza el perfil por contacto directo y accesible', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Mi perfil', exact: true })).toHaveCount(0)
  await expect(page.getByText('Tus compras, a mano', { exact: true })).toHaveCount(0)

  const trigger = page.getByRole('button', { name: 'Abrir menú', exact: true }).first()
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Ayuda y contacto' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await expect(dialog.getByText('Tu minimarket cercano', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Hablar por WhatsApp', exact: true })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/584122636533\?text=/,
  )
  await expect(dialog.getByRole('link', { name: 'Llamar al negocio', exact: true })).toHaveAttribute(
    'href',
    'tel:+584122636533',
  )
  await expect(dialog.getByRole('link', { name: 'Ver Instagram', exact: true })).toHaveAttribute(
    'href',
    'https://www.instagram.com/andesmarket.app/',
  )

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await trigger.click()
  await page.mouse.click(5, 5)
  await expect(dialog).toHaveCount(0)

  const help = page.getByRole('link', { name: 'Contactar un asesor por WhatsApp', exact: true })
  await expect(help).toBeVisible()
  await expect(help).toHaveAttribute('href', /^https:\/\/wa\.me\/584122636533\?text=/)
})

test('la cabecera del catálogo es fija y no depende del scroll', async ({ page }) => {
  await page.goto('/catalogo')
  const header = page.locator('header')
  await expect(header).toHaveCSS('position', 'fixed')
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(0)
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(0)
})

test('compra directa sincronizada, total, persistencia y agotados', async ({ page }) => {
  await page.goto('/catalogo')
  await page.getByRole('button', { name: 'Agregar Leche completa 1 L', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('1 en el carrito', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar una unidad de Leche completa 1 L', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Ver carrito, 2 productos, $4.80', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('2 en el carrito', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Agregar Arroz blanco premium de grano largo 1 kg', exact: true }),
  ).toBeDisabled()
  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page.getByLabel('2 en el carrito', { exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: 'Quitar una unidad de Leche completa 1 L', exact: true }).first().click()
  await expect(page.getByLabel('1 en el carrito', { exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: 'Quitar una unidad de Leche completa 1 L', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Agregar Leche completa 1 L', exact: true })).toHaveCount(2)
})

test('categoría, búsqueda sin tildes, ofertas y navegación atrás', async ({ page }) => {
  await page.goto('/catalogo')
  await categoryButtons(page).getByRole('button', { name: 'Lácteos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Lácteos', exact: true })).toBeVisible()
  await expect(page.locator('article')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('article')).toHaveCount(2)
  await categoryButtons(page).getByRole('button', { name: 'Todo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Todos los productos' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Lácteos', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Todos los productos' })).toBeVisible()

  await page.goto('/')
  await page.getByRole('searchbox').fill('cafe')
  await page.getByRole('searchbox').press('Enter')
  await expect(page.getByRole('button', { name: 'Ver Café molido 250 g', exact: true })).toBeVisible()
  await expect(page.locator('article')).toHaveCount(1)
  await page.reload()
  await expect(page).toHaveURL(/q=cafe/)
  await expect(page.locator('article')).toHaveCount(1)

  await page.goto('/')
  await page.getByRole('searchbox').fill('all')
  await page.getByRole('searchbox').press('Enter')
  await expect(page).toHaveURL(/q=all/)

  await page.goto('/')
  await page.getByRole('searchbox').fill('inexistente')
  await page.getByRole('searchbox').press('Enter')
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.locator('article')).toHaveCount(6)
  await page.getByRole('button', { name: 'Ofertas', exact: true }).click()
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Ver Leche completa 1 L', exact: true })).toBeVisible()
})

test('subcategorías reales, recarga y cambio de departamento', async ({ page }) => {
  await page.goto('/catalogo?categoria=c1')
  await subcategoryButtons(page).getByRole('button', { name: 'Yogures' }).click()
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Ver Yogur natural con frutas 500 g', exact: true })).toBeVisible()
  await page.reload()
  await expect(subcategoryButtons(page).getByRole('button', { name: 'Yogures' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('article')).toHaveCount(1)
  await categoryButtons(page).getByRole('button', { name: 'Despensa' }).click()
  await expect(page.locator('article')).toHaveCount(2)
  await expect(page).not.toHaveURL(/subcategoria/)
  await expect(subcategoryButtons(page)).toHaveCount(0)
})

test('detalle móvil, cantidades, foco, Escape y fondo', async ({ page }) => {
  await page.goto('/catalogo')
  const trigger = page.getByRole('button', { name: 'Ver Leche completa 1 L', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await page.getByRole('button', { name: 'Aumentar cantidad', exact: true }).click()
  await page.getByRole('button', { name: 'Agregar · $4.80', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('link', { name: 'Ver carrito, 2 productos, $4.80', exact: true })).toBeVisible()
  await trigger.click()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    await expect.poll(() => page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.mouse.click(5, 5)
  await expect(dialog).toHaveCount(0)
})

test('diseño móvil y escritorio, imágenes ausentes y movimiento reducido', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(
    page.getByRole('navigation', { name: 'Departamentos' }).getByRole('link', { name: 'Café y desayuno' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Ver todo' }).first().click()
  await expect(page.locator('article')).toHaveCount(6)
  for (const width of [360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const first = await page.locator('article').nth(0).boundingBox()
    const second = await page.locator('article').nth(1).boundingBox()
    expect(first.y).toBe(second.y)
  }
  await expect(page.locator('article').filter({ hasText: 'Yogur natural' }).getByLabel('Sin imagen')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('article').first().locator('button').first().locator('div').first()).toHaveCSS(
    'transition-duration',
    '0s',
  )
  expect(errors).toEqual([])
})

test('errores recuperables, estados vacíos y categoría inválida', async ({ page }) => {
  await page.route('**/rest/v1/products?**', (route) =>
    route.fulfill({ status: 503, headers: { 'Retry-After': '0' }, json: { message: 'Sin conexión' } }),
  )
  await page.goto('/catalogo')
  // Supabase agota sus reintentos automáticos antes de mostrar el error.
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar', { timeout: 15000 })
  await page.unroute('**/rest/v1/products?**')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.locator('article')).toHaveCount(6)
  await page.goto('/catalogo?categoria=no-existe')
  await expect(page.getByRole('heading', { name: 'Categoría no disponible' })).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.locator('article')).toHaveCount(6)
  await page.route('**/rest/v1/products?**', (route) => route.fulfill({ json: [] }))
  await page.reload()
  await expect(page.getByRole('status')).toContainText('No hay productos')
})

test('carrito: delivery, retiro y formulario de identificación sin crear pedido', async ({ page }) => {
  await page.goto('/catalogo')
  await page.getByRole('button', { name: 'Agregar Leche completa 1 L', exact: true }).click()
  await page.getByRole('link', { name: 'Ver carrito, 1 producto, $2.40', exact: true }).click()
  await page.getByRole('button', { name: 'Delivery', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Dirección de entrega' })).toBeVisible()
  await page.getByRole('button', { name: 'Retiro en tienda' }).click()
  await expect(page.getByRole('textbox', { name: 'Dirección de entrega' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirmar pedido', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
