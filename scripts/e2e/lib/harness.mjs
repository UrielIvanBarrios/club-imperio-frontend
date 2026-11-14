// Arnés de las pruebas E2E: un navegador simulado (jsdom) que monta la app real
// (src/main.tsx, compilada por Vite igual que en `npm run dev`) y le pega al back real.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import { config, FRONT } from './config.mjs'

export async function crearNavegador(urlInicial) {
  // ---------- DOM simulado ----------
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: `http://localhost:5173${urlInicial}`,
    pretendToBeVisual: true,
  })
  const w = dom.window
  // jsdom no implementa matchMedia: simulamos pantalla de escritorio (menú lateral fijo)
  w.matchMedia = (q) => ({
    matches: q.includes('min-width'), media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  })
  for (const k of Object.getOwnPropertyNames(w)) {
    if (!(k in globalThis)) {
      try { globalThis[k] = w[k] } catch { /* propiedades de solo lectura */ }
    }
  }
  // Estas existen en Node con otra implementación: se reemplazan por las del navegador simulado.
  // (FormData: React 19 arma un FormData del <form> al enviarlo y el de Node no acepta un form de jsdom.)
  for (const k of ['window', 'document', 'navigator', 'localStorage', 'location', 'history', 'matchMedia', 'FormData']) {
    Object.defineProperty(globalThis, k, { value: k === 'window' ? w : w[k], configurable: true, writable: true })
  }

  const erroresConsola = []
  const consoleError = console.error
  console.error = (...a) => erroresConsola.push(a.map((x) => x?.stack ?? String(x)).join(' ').slice(0, 1500))

  // ---------- Vite ----------
  process.env.VITE_API_URL = config.apiUrl
  const req = createRequire(`${FRONT}/package.json`)
  const { createServer } = await import(pathToFileURL(req.resolve('vite')).href)
  const vite = await createServer({ root: FRONT, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  const session = await vite.ssrLoadModule('/src/auth/session.ts')
  const client = await vite.ssrLoadModule('/src/api/client.ts')

  // ---------- resultados ----------
  let fallas = 0
  const ok = (cond, msg) => {
    console.log(`${cond ? '  OK   ' : '  FALLA'}  ${msg}`)
    if (!cond) fallas++
  }
  const paso = (titulo) => console.log(`\n${titulo}`)

  // ---------- helpers de interacción ----------
  const texto = () => document.body.textContent
  const esperar = async (pred, ms = 10000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) {
      if (pred()) return true
      await pausa(30)
    }
    return false
  }
  const escribir = (el, valor) => {
    // Setter nativo + evento input: es lo que hace el navegador cuando el usuario tipea
    const proto = el instanceof w.HTMLTextAreaElement ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor)
    el.dispatchEvent(new w.Event('input', { bubbles: true }))
  }
  const input = (name) => document.querySelector(`input[name="${name}"]`)
  const setInput = (name, valor) => escribir(input(name), valor)
  const helper = (name) => input(name)?.closest('.MuiFormControl-root')?.querySelector('.MuiFormHelperText-root')?.textContent ?? ''
  const boton = (txt, raiz = document) => [...raiz.querySelectorAll('button, a')].find((b) => b.textContent.trim() === txt)
  const submit = () => document.querySelector('form button[type="submit"]').click()
  // React Router navega dentro de una transición de React: la URL cambia enseguida, pero la
  // pantalla anterior sigue montada hasta que la nueva se termina de dibujar. irA espera a que
  // la pantalla anterior desaparezca, así el paso siguiente no lee lo que había antes.
  // (Si la ruta muestra el mismo componente, ej: solo cambian los filtros, sigue a los 3 s.)
  const raizPagina = () => document.querySelector('main')?.children[1]
  const irA = async (path) => {
    const antes = raizPagina()
    history.pushState({}, '', path)
    w.dispatchEvent(new w.PopStateEvent('popstate'))
    if (antes) await esperar(() => !antes.isConnected, 3000)
  }
  const atras = () => {
    history.back()
    w.dispatchEvent(new w.PopStateEvent('popstate'))
  }
  const h1 = () => document.querySelector('h1')?.textContent
  const filas = () => document.querySelectorAll('tbody tr').length
  const dialogo = () => document.querySelector('[role="dialog"]')
  const login = async ({ email, password }) => {
    await esperar(() => input('email'))
    await pausa(100)
    setInput('email', email)
    setInput('password', password)
    submit()
  }

  // Simula un back lento (para ver "Guardando...") o caído
  const fetchReal = globalThis.fetch
  const red = {
    lenta: (ms = 400) => { globalThis.fetch = async (...a) => { await pausa(ms); return fetchReal(...a) } },
    caida: () => { globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch')) },
    normal: () => { globalThis.fetch = fetchReal },
  }

  return {
    w, vite, session, client, ok, paso, texto, esperar, escribir, input, setInput, helper, boton, submit,
    irA, atras, h1, filas, dialogo, login, red, erroresConsola,
    // Login por API: para las pruebas que no son del login en sí
    async sesionAdmin() {
      const r = await client.api('/api/auth/login', { method: 'POST', body: config.admin, auth: false })
      session.saveSession({ token: r.token, expiraEn: r.expiraEn, usuario: r.usuario })
    },
    montarApp: () => vite.ssrLoadModule('/src/main.tsx'),
    sinErroresDeReact() {
      const reales = erroresConsola.filter((e) => !e.includes('Failed to fetch'))
      ok(reales.length === 0, `sin errores de React en consola${reales.length ? `: ${reales[0]}` : ''}`)
    },
    async terminar() {
      red.normal()
      console.error = consoleError
      await vite.close()
      console.log(`\n${fallas === 0 ? 'TODO OK' : `${fallas} FALLA(S)`}`)
      process.exit(fallas ? 1 : 0)
    },
    fallar(msg) {
      fallas++
      console.log(`  ERROR  ${msg}`)
    },
  }
}

export const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
