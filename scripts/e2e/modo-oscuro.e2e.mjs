// E2E: modo claro / oscuro. Sin nada guardado respeta la preferencia del sistema; el botón sol/luna
// de la barra superior cambia el modo y lo guarda en localStorage; si localStorage falla, el botón
// sigue funcionando y la app no se rompe. No crea datos.
import { crearNavegador } from './lib/harness.mjs'

const b = await crearNavegador('/')
const { ok, paso, esperar, h1, w } = b

const CLAVE = 'club-imperio:modo'
const boton = () => document.querySelector('header button[aria-label^="Cambiar a modo"]')
// El fondo del body lo pone CssBaseline con background.default del tema de cada modo
const fondo = () => w.getComputedStyle(document.body).backgroundColor
const CLARO = 'rgb(244, 246, 251)' // #F4F6FB
const OSCURO = 'rgb(13, 18, 32)' // #0D1220

try {
  await b.sesionAdmin()

  paso('[1] Primera vez: respeta la preferencia del sistema (oscuro)')
  localStorage.removeItem(CLAVE)
  // El sistema "prefiere oscuro" (el arnés, por defecto, dice que no)
  const matchMediaOriginal = w.matchMedia
  w.matchMedia = globalThis.matchMedia = (q) => ({ ...matchMediaOriginal(q), matches: q.includes('prefers-color-scheme: dark') || q.includes('min-width') })
  await b.montarApp()
  ok(await esperar(() => h1()?.startsWith('Hola') && !!boton()), 'entra al dashboard, con el botón en la barra')
  ok(fondo() === OSCURO, `arranca en oscuro (fondo ${fondo()})`)
  ok(boton().getAttribute('aria-label') === 'Cambiar a modo claro', 'el botón ofrece pasar a claro (sol)')
  ok(localStorage.getItem(CLAVE) === null, 'no guarda nada mientras el usuario no elija')

  paso('[2] El botón cambia el modo y lo recuerda')
  boton().click()
  ok(await esperar(() => fondo() === CLARO), `pasa a claro (fondo ${fondo()})`)
  ok(boton().getAttribute('aria-label') === 'Cambiar a modo oscuro', 'ahora ofrece pasar a oscuro (luna)')
  ok(localStorage.getItem(CLAVE) === 'light', 'guarda "light" en localStorage')
  boton().click()
  ok(await esperar(() => fondo() === OSCURO && localStorage.getItem(CLAVE) === 'dark'), 'y vuelve a oscuro, guardando "dark"')

  paso('[3] Si localStorage falla, el botón sigue andando')
  const setItem = w.Storage.prototype.setItem
  w.Storage.prototype.setItem = () => { throw new w.DOMException('QuotaExceededError') }
  boton().click()
  ok(await esperar(() => fondo() === CLARO), 'cambia a claro igual')
  ok(localStorage.getItem(CLAVE) === 'dark', 'lo guardado quedó como estaba (no se pudo escribir)')
  w.Storage.prototype.setItem = setItem

  paso('[4] Consola')
  b.sinErroresDeReact()
} catch (e) {
  b.fallar(e.stack ?? e)
} finally {
  localStorage.removeItem(CLAVE)
  await b.terminar()
}
