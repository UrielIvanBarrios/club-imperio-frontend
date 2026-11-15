// E2E: Dashboard contra el back real: los cuatro contadores coinciden con lo que dice el back, suben al crear
// datos, cada uno falla y se reintenta por su cuenta, y los accesos rápidos llevan a su pantalla.
// Lo que crea lleva el prefijo "TEST-FRONT <corrida>" (actividades) o apellido TEST-FRONT con DNI 99xxxxxx
// (personas), y se borra al final por SQL.
import { sql } from './lib/config.mjs'
import { crearNavegador } from './lib/harness.mjs'

const b = await crearNavegador('/')
const { ok, paso, esperar, boton, irA, h1, client, red } = b

const CORRIDA = Date.now().toString(36).toUpperCase()
const PREFIJO = `TEST-FRONT ${CORRIDA}`
const base = 99000000 + Math.floor(Math.random() * 900000)
const DNIS = [0, 1].map((i) => String(base + i))
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const HOY = iso(new Date())

const TITULOS = ['Socios activos', 'Actividades', 'Comisiones', 'Clases de prueba pendientes']
const tarjeta = (titulo) => document.querySelector(`section[aria-label="${titulo}"]`)
const valor = (titulo) => tarjeta(titulo)?.querySelector('[data-contador]')?.textContent ?? null
const detalle = (titulo) => tarjeta(titulo)?.querySelector('p.MuiTypography-body2')?.textContent ?? ''
const valores = () => TITULOS.map(valor)
const api = (path, method = 'GET', body) => client.api(path, { method, body })

// Lo que el dashboard tendría que mostrar, preguntado al back por otro camino
async function esperado() {
  const socios = (await api('/api/personas?activo=true&esSocio=true')).length
  const actividades = (await api('/api/actividades')).filter((a) => a.activo)
  let comisiones = 0
  for (const a of actividades) comisiones += (await api(`/api/comisiones/actividad/${a.actividadId}`)).length
  const pendientes = (await api('/api/clases-prueba')).filter((c) => !c.asistio)
  return {
    valores: [socios, actividades.length, comisiones, pendientes.length].map(String),
    deHoy: pendientes.filter((c) => c.fechaSolicitada.startsWith(HOY)).length,
  }
}

try {
  await b.sesionAdmin()

  paso('[1] Back caído al entrar: cada contador avisa y se reintenta')
  red.caida()
  await b.montarApp()
  ok(await esperar(() => h1()?.startsWith('Hola') && TITULOS.every((t) => tarjeta(t)?.textContent.includes('No se pudo cargar')), 15000),
    `los cuatro contadores muestran "No se pudo cargar" (${JSON.stringify(TITULOS.map((t) => tarjeta(t)?.textContent))})`)
  ok(!!boton('Tomar asistencia'), 'los accesos rápidos se ven igual')
  red.normal()
  boton('Reintentar', tarjeta('Socios activos')).click()
  ok(await esperar(() => valor('Socios activos') !== null), 'Reintentar en uno lo carga...')
  ok(valor('Actividades') === null && tarjeta('Actividades').textContent.includes('No se pudo cargar'), '...sin tocar a los demás')
  for (const t of TITULOS.slice(1)) boton('Reintentar', tarjeta(t))?.click()
  ok(await esperar(() => valores().every((v) => v !== null)), 'reintentando los otros, cargan todos')

  paso('[2] Los números coinciden con el back')
  const antes = await esperado()
  ok(JSON.stringify(valores()) === JSON.stringify(antes.valores), `contadores ${JSON.stringify(valores())} = back ${JSON.stringify(antes.valores)}`)
  ok(detalle('Clases de prueba pendientes') === (antes.deHoy === 0 ? 'ninguna para hoy' : `${antes.deHoy} para hoy`), `"${detalle('Clases de prueba pendientes')}"`)
  ok(/^de \d+ personas? activas$/.test(detalle('Socios activos')), `socios: "${detalle('Socios activos')}"`)

  paso('[3] Al crear datos, los contadores suben')
  await api('/api/personas', 'POST', { dni: DNIS[0], nombre: 'Socio', apellido: 'TEST-FRONT', seAsocia: true })
  await api('/api/personas', 'POST', { dni: DNIS[1], nombre: 'Prospecto', apellido: 'TEST-FRONT' })
  const act = await api('/api/actividades', 'POST', { nombre: `${PREFIJO} Básquet`, precioMensual: 8000 })
  for (const nombre of ['Mañana', 'Tarde']) {
    await api(`/api/comisiones?${new URLSearchParams({ actividadId: act.actividadId, nombre, horario: 'Sábado 10:00' })}`, 'POST')
  }
  // La pide el socio: el contador lee el listado, que antes fallaba con personas socias
  await api(`/api/clases-prueba/registrar?${new URLSearchParams({ dni: DNIS[0], actividadId: act.actividadId, fecha: `${HOY}T23:00:00` })}`, 'POST')
  await irA('/personas')
  await irA('/')
  const suma = antes.valores.map((v, i) => String(Number(v) + [1, 1, 2, 1][i]))
  ok(await esperar(() => JSON.stringify(valores()) === JSON.stringify(suma)), `+1 socio, +1 actividad, +2 comisiones, +1 pendiente: ${JSON.stringify(valores())}`)
  ok(detalle('Clases de prueba pendientes') === `${antes.deHoy + 1} para hoy`, `la de hoy cuenta "para hoy" ("${detalle('Clases de prueba pendientes')}")`)
  const despues = await esperado()
  ok(JSON.stringify(valores()) === JSON.stringify(despues.valores), 'y siguen coincidiendo con el back')

  paso('[4] Links y accesos rápidos')
  const hrefs = TITULOS.map((t) => boton('Ver', tarjeta(t))?.getAttribute('href'))
  ok(JSON.stringify(hrefs) === JSON.stringify(['/personas?socio=socios', '/actividades', '/comisiones', '/clases-prueba']), `"Ver" de cada contador: ${JSON.stringify(hrefs)}`)
  const atajos = { 'Tomar asistencia': '/asistencia', 'Inscribir socio': '/inscripciones', 'Nueva clase de prueba': '/clases-prueba/nueva', 'Nueva persona': '/personas/nueva', 'Importar socios': '/importar' }
  ok(Object.entries(atajos).every(([txt, href]) => boton(txt)?.getAttribute('href') === href), 'accesos rápidos, con "Importar socios" porque es ADMIN')
  boton('Ver', tarjeta('Clases de prueba pendientes')).click()
  ok(await esperar(() => location.pathname === '/clases-prueba' && h1() === 'Clases de prueba'), '"Ver" lleva a la pantalla')

  paso('[5] Menú y consola')
  await irA('/')
  ok(await esperar(() => document.querySelector('a.Mui-selected')?.textContent === 'Dashboard'), '"Dashboard" resaltado en el menú')
  b.sinErroresDeReact()
} catch (e) {
  b.fallar(e.stack ?? e)
} finally {
  red.normal()
  try {
    const dnis = DNIS.map((d) => `'${d}'`).join(',')
    const filasSql = sql(`
      BEGIN;
      CREATE TEMP TABLE obj ON COMMIT DROP AS SELECT actividad_id FROM actividades WHERE nombre LIKE '${PREFIJO} %';
      CREATE TEMP TABLE obj_p ON COMMIT DROP AS SELECT persona_id FROM personas WHERE apellido = 'TEST-FRONT' AND dni IN (${dnis});
      SELECT 'borradas', (SELECT count(*) FROM obj), (SELECT count(*) FROM obj_p);
      DELETE FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM obj) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM comisiones WHERE actividad_id IN (SELECT actividad_id FROM obj);
      DELETE FROM actividades WHERE actividad_id IN (SELECT actividad_id FROM obj);
      DELETE FROM membresias WHERE persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM personas WHERE persona_id IN (SELECT persona_id FROM obj_p);
      COMMIT;
      SELECT 'restantes', (SELECT count(*) FROM actividades WHERE nombre LIKE '${PREFIJO} %'), (SELECT count(*) FROM personas WHERE apellido = 'TEST-FRONT' AND dni IN (${dnis}));`)
    const [, actividades, personas] = filasSql.find((f) => f[0] === 'borradas')
    const [, restA, restP] = filasSql.find((f) => f[0] === 'restantes')
    console.log(`\n[limpieza] borradas ${actividades} actividades (con sus comisiones y clases de prueba) y ${personas} personas; quedan ${restA} y ${restP}`)
    if (restA !== '0' || restP !== '0') b.fallar('la limpieza dejó datos de prueba')
  } catch (e) {
    b.fallar(`limpieza: ${e.message}`)
  }
  await b.terminar()
}
