// E2E: login, rutas protegidas, roles y manejo del 401.
// Crea un USER temporal (e2e-xxxx@clubimperio.com) y lo borra al final.
import { config, sql } from './lib/config.mjs'
import { crearNavegador } from './lib/harness.mjs'

const b = await crearNavegador('/personas')
const { ok, paso, texto, esperar, submit, setInput, irA, h1, login, session, client, red } = b

const USER = {
  email: `e2e-${Date.now().toString(36)}@clubimperio.com`,
  password: 'E2eUser12345',
  nombre: 'E2E Usuario',
  rol: 'USER',
}
let userCreado = false

try {
  paso('[1] Sin sesión, entrar a /personas')
  await b.montarApp()
  ok(await esperar(() => location.pathname === '/login'), `redirige a /login (está en ${location.pathname})`)
  ok(await esperar(() => texto().includes('Iniciá sesión para continuar')), 'muestra el formulario de login')

  paso('[2] Validación de Zod (sin pegarle al back)')
  submit()
  ok(await esperar(() => texto().includes('Ingresá tu email') && texto().includes('Ingresá tu contraseña')), 'campos vacíos → "Ingresá tu email" / "Ingresá tu contraseña"')
  setInput('email', 'no-es-un-email')
  submit()
  ok(await esperar(() => texto().includes('El email no es válido')), 'email mal formado → "El email no es válido"')

  paso('[3] Contraseña incorrecta')
  await login({ email: config.admin.email, password: 'incorrecta' })
  ok(await esperar(() => texto().includes('Email o contraseña incorrectos.')), 'muestra el mensaje del back (401 del login)')
  ok(location.pathname === '/login' && !session.getToken(), 'sigue en /login y no guarda sesión')

  paso('[4] Login ADMIN')
  await login(config.admin)
  ok(await esperar(() => location.pathname === '/personas'), `vuelve a la pantalla pedida (/personas), está en ${location.pathname}`)
  ok(await esperar(() => texto().includes('· ADMIN')), 'barra superior: "<nombre> · ADMIN"')
  ok(texto().includes('Usuarios') && texto().includes('Importar socios'), 'el menú muestra las opciones de ADMIN')
  ok(!!session.getToken(), 'token guardado en localStorage')
  const me = await client.api('/api/auth/me')
  ok(me.email === config.admin.email, 'api("/api/auth/me") manda el token y trae al admin')

  paso('[5] Navegación con el menú')
  ;[...document.querySelectorAll('a')].find((a) => a.textContent === 'Actividades').click()
  ok(await esperar(() => location.pathname === '/actividades' && h1() === 'Actividades'), 'click en "Actividades" → /actividades')
  ok(document.querySelector('a.Mui-selected')?.textContent === 'Actividades', 'el ítem activo queda resaltado')

  paso('[6] Crear el USER temporal (como ADMIN)')
  await client.api('/api/usuarios', { method: 'POST', body: USER })
  userCreado = true
  ok(true, `creado ${USER.email}`)

  paso('[7] Logout')
  document.querySelector('button[aria-label="Cerrar sesión"]').click()
  ok(await esperar(() => location.pathname === '/login'), 'botón de logout → /login')
  ok(!session.getToken(), 'borra la sesión')
  ok(!document.querySelector('.MuiAlert-colorWarning'), 'logout voluntario no muestra ningún aviso de sesión')

  paso('[8] Login USER y permisos')
  await login(USER)
  ok(await esperar(() => texto().includes(`${USER.nombre} · USER`)), `barra superior: "${USER.nombre} · USER"`)
  ok(!texto().includes('Usuarios') && !texto().includes('Importar socios'), 'el menú NO muestra las opciones de ADMIN')
  await irA('/usuarios')
  ok(await esperar(() => texto().includes('No tenés permisos para ver esta pantalla.')), 'entrar a /usuarios a mano → "sin permisos"')
  try {
    await client.api('/api/usuarios')
    ok(false, 'el back debió responder 403')
  } catch (e) {
    ok(e instanceof client.ApiError && e.status === 403, `back responde 403: "${e.message}"`)
  }
  ok(!!session.getToken() && texto().includes(`${USER.nombre} · USER`), 'un 403 NO cierra la sesión')

  paso('[9] Token inválido → 401 → login')
  const s = session.loadSession()
  session.saveSession({ ...s, token: `${s.token}x` })
  await irA('/comisiones')
  await esperar(() => h1() === 'Comisiones')
  try {
    await client.api('/api/auth/me')
  } catch (e) {
    ok(e.status === 401, `back responde 401: "${e.message}"`)
  }
  ok(await esperar(() => location.pathname === '/login'), 'el front redirige a /login solo')
  ok(await esperar(() => texto().includes('Sesión inválida o vencida. Iniciá sesión nuevamente.')), 'muestra el motivo que manda el back')
  ok(!session.getToken(), 'la sesión quedó borrada')
  await login(USER)
  ok(await esperar(() => location.pathname === '/comisiones'), 'al reloguearse vuelve a /comisiones')

  paso('[10] Sesión vencida guardada (simula abrir la app al otro día)')
  session.saveSession({ ...session.loadSession(), expiraEn: new Date(Date.now() - 1000).toISOString() })
  ok(session.loadSession() === null && localStorage.length === 0, 'loadSession la descarta y la borra')
  ok(!Number.isNaN(new Date('2026-11-14T04:09:58.401931700Z').getTime()), 'expiraEn del back (9 decimales) se parsea bien')

  paso('[11] Back caído')
  red.caida()
  try {
    await client.api('/api/auth/me')
  } catch (e) {
    ok(e.status === 0 && e.message.startsWith('No se pudo conectar'), `mensaje: "${e.message}"`)
  }
  red.normal()
  b.sinErroresDeReact()
} catch (e) {
  b.fallar(e.stack ?? e)
} finally {
  // Limpieza: borrado físico del USER temporal. Doble condición (email exacto + prefijo e2e-)
  // para no poder tocar nunca otro usuario.
  if (userCreado) {
    try {
      const [[borrados]] = sql(`WITH d AS (DELETE FROM usuarios WHERE email = '${USER.email}' AND email LIKE 'e2e-%@clubimperio.com' RETURNING 1) SELECT count(*) FROM d;`)
      console.log(`\n[limpieza] usuario temporal borrado (${borrados})`)
      if (borrados !== '1') b.fallar('la limpieza no borró el usuario temporal')
    } catch (e) {
      b.fallar(`limpieza: ${e.message}`)
    }
  }
  await b.terminar()
}
