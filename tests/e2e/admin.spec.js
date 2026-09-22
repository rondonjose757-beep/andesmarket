import { test, expect } from '@playwright/test'

function session(id, anonymous) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return {
    access_token: `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, exp, role: 'authenticated', is_anonymous: anonymous })).toString('base64url')}.firma-sintetica`,
    refresh_token: `refresh-sintetico-${id}`, token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id, is_anonymous: anonymous, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() },
  }
}

async function setup(context, options = {}) {
  const publicSession = session('cliente-sintetico', true)
  const adminSession = session('operador-sintetico', options.anonymous ?? false)
  const state = { mustChange: options.mustChange ?? false, loginCalls: 0, verifyCalls: 0, changeCalls: 0, logouts: [], operatorError: false }
  await context.addInitScript(({ publicSession }) => {
    if (!localStorage.getItem('sb-andesmarket-auth')) localStorage.setItem('sb-andesmarket-auth', JSON.stringify(publicSession))
    if (!localStorage.getItem('andesmarket.cart.v1')) localStorage.setItem('andesmarket.cart.v1', JSON.stringify([
      { productId: 'fixture', productName: 'Producto de prueba', quantity: 1, unitPrice: 2 },
    ]))
  }, { publicSession })
  await context.route('https://andesmarket-test.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/functions/v1/admin-login') {
      state.loginCalls++
      expect(request.method()).toBe('POST')
      expect(request.postDataJSON()).toEqual({ nombre: 'Alejandro', pin: '1357' })
      return route.fulfill({ status: options.loginStatus ?? 200,
        json: options.loginStatus ? { error: 'detalle privado no mostrar' }
          : { token_hash: 'token-canje-sintetico', type: 'email', must_change_pin: false } })
    }
    if (url.pathname === '/auth/v1/verify') {
      state.verifyCalls++
      expect(request.postDataJSON()).toMatchObject({ token_hash: 'token-canje-sintetico', type: 'email' })
      return route.fulfill({ status: options.verifyError ? 400 : 200, json: options.verifyError ? { msg: 'canje fallido' } : adminSession })
    }
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: adminSession.user })
    if (url.pathname === '/auth/v1/logout') {
      state.logouts.push({ local: url.searchParams.get('scope') === 'local', admin: request.headers().authorization === `Bearer ${adminSession.access_token}` })
      return route.fulfill({ status: options.logoutError ? 503 : 204 })
    }
    if (url.pathname === '/rest/v1/admin_operators') {
      expect(request.headers().authorization).toBe(`Bearer ${adminSession.access_token}`)
      if (state.operatorError) return route.fulfill({ status: 503, json: { message: 'error interno' } })
      return route.fulfill({ json: options.missing ? [] : [{ id: 'operador-fila', auth_user_id: adminSession.user.id,
        display_name: 'Alejandro', active: options.active ?? true, must_change_pin: state.mustChange }] })
    }
    if (url.pathname === '/rest/v1/rpc/change_admin_pin') {
      state.changeCalls++
      expect(request.postDataJSON()).toEqual({ current_pin: '1357', new_pin: '8642' })
      expect(request.headers().authorization).toBe(`Bearer ${adminSession.access_token}`)
      if (options.changeOutcome) return route.fulfill({ json: { success: false, outcome: options.changeOutcome } })
      if (!options.keepPending) state.mustChange = false
      return route.fulfill({ json: { success: true, outcome: 'ok' } })
    }
    if (url.pathname === '/rest/v1/customers') return route.fulfill({ json: [] })
    if (url.pathname.startsWith('/rest/')) return route.fulfill({ json: [] })
    return route.fulfill({ status: 400, json: { message: 'Ruta de prueba no prevista' } })
  })
  return state
}

async function login(page) {
  await page.goto('/admin/login')
  await page.getByLabel(/^Nombre/).fill('Alejandro')
  await page.getByLabel(/^PIN \*/).fill('1357')
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}

test('admin: canje aislado, persistencia por pestaña y logout sin tocar tienda ni carrito', async ({ context, page }) => {
  const state = await setup(context)
  await page.goto('/admin/login')
  // Solo almacenamiento SINTÉTICO de este contexto aislado de pruebas.
  const before = await page.evaluate(() => ({ session: localStorage.getItem('sb-andesmarket-auth'), cart: localStorage.getItem('andesmarket.cart.v1') }))
  await login(page)
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toBeVisible()
  expect(state.verifyCalls).toBe(1)
  expect(await page.evaluate(() => ({
    admin: Boolean(sessionStorage.getItem('sb-andesmarket-admin-auth')),
    publicAdmin: localStorage.getItem('sb-andesmarket-admin-auth'),
    leaked: JSON.stringify({ ...sessionStorage, ...localStorage }).includes('token-canje-sintetico'),
  }))).toEqual({ admin: true, publicAdmin: null, leaked: false })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toBeVisible()
  expect(state.verifyCalls).toBe(1)
  await page.getByRole('button', { name: 'Cerrar sesión administrativa' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  expect(state.logouts).toEqual([{ local: true, admin: true }])
  expect(await page.evaluate(() => ({ session: localStorage.getItem('sb-andesmarket-auth'), cart: localStorage.getItem('andesmarket.cart.v1') }))).toEqual(before)
  expect(await page.evaluate(() => sessionStorage.getItem('sb-andesmarket-admin-auth'))).toBeNull()
  await page.goto('/catalogo')
  await expect(page.getByRole('heading', { name: 'Acceso administrativo' })).toHaveCount(0)
})

for (const status of [401, 429, 503]) test(`admin: login HTTP ${status} muestra mensaje seguro`, async ({ context, page }) => {
  const state = await setup(context, { loginStatus: status })
  await login(page)
  await expect(page.getByRole('alert')).toContainText(status === 429 ? 'Demasiados intentos' : 'No se pudo iniciar sesión')
  await expect(page.getByText('detalle privado no mostrar')).toHaveCount(0)
  expect(state.verifyCalls).toBe(0)
})

test('admin: PIN pendiente bloquea todas las rutas y cambio exitoso relee operador sin recarga', async ({ context, page }) => {
  const state = await setup(context, { mustChange: true })
  await login(page)
  await expect(page).toHaveURL(/\/admin\/cambiar-pin$/)
  await page.goto('/admin/pedidos')
  await expect(page).toHaveURL(/\/admin\/cambiar-pin$/)
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toHaveCount(0)
  await page.getByLabel(/^PIN actual/).fill('1357')
  await page.getByLabel(/^Nuevo PIN/).fill('8642')
  await page.getByLabel('Confirmación del nuevo PIN').fill('8642')
  let navigations = 0
  page.on('request', (req) => { if (req.isNavigationRequest()) navigations++ })
  await page.getByRole('button', { name: 'Guardar nuevo PIN' }).click()
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toBeVisible()
  expect(state.changeCalls).toBe(1)
  expect(navigations).toBe(0)
})

for (const options of [{ anonymous: true }, { active: false }, { missing: true }]) {
  test(`admin: sesión no autorizada se elimina ${JSON.stringify(options)}`, async ({ context, page }) => {
    await setup(context, options)
    await login(page)
    await expect(page.getByRole('heading', { name: 'Acceso administrativo' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('No se pudo iniciar sesión')
    expect(await page.evaluate(() => sessionStorage.getItem('sb-andesmarket-admin-auth'))).toBeNull()
  })
}

test('admin: error de lectura bloquea acceso; retry y logout siguen disponibles', async ({ context, page }) => {
  const state = await setup(context)
  state.operatorError = true
  await login(page)
  await expect(page.getByRole('heading', { name: 'No pudimos verificar tu acceso' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toHaveCount(0)
  state.operatorError = false
  await page.getByRole('button', { name: 'Volver a intentar' }).click()
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toBeVisible()
})

test('admin: portada pública no importa módulos administrativos ni muestra enlaces al admin', async ({ context, page }) => {
  await setup(context)
  const administrativeRequests = []
  page.on('request', (req) => { if (/\/src\/.*(?:\/admin\/|AdminAuth|adminSupabase|adminAccess)/.test(req.url())) administrativeRequests.push(req.url()) })
  await page.goto('/')
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0)
  expect(administrativeRequests).toEqual([])
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Acceso administrativo' })).toBeVisible()
  expect(administrativeRequests.length).toBeGreaterThan(0)
})

test('admin: validación local no envía formularios incompletos y falla seguro si el canje falla', async ({ context, page }) => {
  const state = await setup(context, { verifyError: true })
  await page.goto('/admin/login')
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Escribe tu nombre')
  expect(state.loginCalls).toBe(0)
  await login(page)
  await expect(page.getByRole('alert')).toContainText('No se pudo iniciar sesión')
  await expect(page).toHaveURL(/\/admin\/login$/)
})

for (const [outcome, expected] of [['denied', 'Revisa el PIN actual'], ['rate_limited', 'Demasiados intentos'], ['invalid_new_pin', 'Elige un PIN']]) {
  test(`admin: rechazo RPC ${outcome} conserva bloqueo del dashboard`, async ({ context, page }) => {
    await setup(context, { mustChange: true, changeOutcome: outcome })
    await login(page)
    await expect(page).toHaveURL(/\/admin\/cambiar-pin$/)
    await page.getByLabel(/^PIN actual/).fill('1357')
    await page.getByLabel(/^Nuevo PIN/).fill('8642')
    await page.getByLabel('Confirmación del nuevo PIN').fill('8642')
    await page.getByRole('button', { name: 'Guardar nuevo PIN' }).click()
    await expect(page.getByRole('alert')).toContainText(expected)
    await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toHaveCount(0)
  })
}

test('admin: no basta éxito RPC si la fila sigue exigiendo cambio de PIN', async ({ context, page }) => {
  const state = await setup(context, { mustChange: true, keepPending: true })
  await login(page)
  await expect(page).toHaveURL(/\/admin\/cambiar-pin$/)
  await page.getByLabel(/^PIN actual/).fill('1357')
  await page.getByLabel(/^Nuevo PIN/).fill('8642')
  await page.getByLabel('Confirmación del nuevo PIN').fill('8642')
  await page.getByRole('button', { name: 'Guardar nuevo PIN' }).click()
  await expect.poll(() => state.changeCalls).toBe(1)
  await expect(page.getByRole('heading', { name: 'Cambia tu PIN' })).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/cambiar-pin$/)
})

test('admin: logout elimina solo almacenamiento admin aunque falle la revocación remota', async ({ context, page }) => {
  await setup(context, { logoutError: true })
  await login(page)
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión administrativa' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  expect(await page.evaluate(() => Boolean(localStorage.getItem('sb-andesmarket-auth')) && !sessionStorage.getItem('sb-andesmarket-admin-auth'))).toBe(true)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test('admin: otra pestaña no adopta la sesión administrativa', async ({ context, page }) => {
  await setup(context)
  const other = await context.newPage()
  await other.goto('/admin/login')
  await login(page)
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toBeVisible()
  await expect(other.getByRole('heading', { name: 'Acceso administrativo' })).toBeVisible()
  expect(await other.evaluate(() => sessionStorage.getItem('sb-andesmarket-admin-auth'))).toBeNull()
  await other.close()
})

test('admin: diseño responsive, teclado y errores accesibles', async ({ context, page }, testInfo) => {
  await setup(context)
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/admin/login')
  await expect(page.getByRole('heading', { name: 'Acceso administrativo' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel(/^Nombre/)).toBeFocused()
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('admin-login-mobile.png'), fullPage: true })
  await login(page)
  await expect(page.getByRole('heading', { name: 'Bienvenido, Alejandro' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('admin-home-mobile.png'), fullPage: true })
  expect(pageErrors).toEqual([])
})
