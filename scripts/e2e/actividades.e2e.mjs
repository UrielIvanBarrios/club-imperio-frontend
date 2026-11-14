// E2E: ABM de Actividades contra el back real, incluida la baja en cascada (comisiones e inscripciones).
// Todo lo que crea lleva el prefijo "TEST-FRONT <corrida>" y se borra al final por SQL.
import { sql } from './lib/config.mjs'
import { crearNavegador } from './lib/harness.mjs'

const b = await crearNavegador('/actividades')
const { ok, paso, texto, esperar, input, setInput, escribir, helper, boton, submit, irA, h1, filas, dialogo, client, red } = b

const CORRIDA = Date.now().toString(36).toUpperCase()
const PREFIJO = `TEST-FRONT ${CORRIDA}`
const NOMBRE = `${PREFIJO} Vóley`
const DNI = String(99000000 + Math.floor(Math.random() * 900000)) // socio que se inscribe para probar la cascada
const etiquetas = () => document.querySelectorAll('.MuiTypography-caption')
const dato = (label) => [...etiquetas()].find((c) => c.textContent === label)?.nextSibling?.textContent
const filaDe = (nombre) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.querySelector('td')?.textContent === nombre)
const buscar = async (valor) => {
  await esperar(() => document.querySelector('input:not([name])'))
  escribir(document.querySelector('input:not([name])'), valor)
}

try {
  await b.sesionAdmin()

  paso('[1] Listado: skeleton → datos')
  await b.montarApp()
  ok(await esperar(() => document.querySelector('[aria-busy="true"]')), 'muestra el skeleton mientras carga')
  ok(await esperar(() => !document.querySelector('[aria-busy="true"]') && (filas() > 0 || texto().includes('Todavía no hay actividades'))), 'muestra la tabla (o el estado vacío)')

  paso('[2] Alta: validaciones de Zod')
  boton('Nueva actividad').click()
  ok(await esperar(() => location.pathname === '/actividades/nueva' && input('nombre')), 'botón "Nueva actividad" → /actividades/nueva')
  submit()
  ok(await esperar(() => helper('nombre') === 'El nombre es obligatorio'), `nombre vacío → "${helper('nombre')}"`)
  ok(helper('precioMensual') === 'El precio es obligatorio', `precio vacío → "${helper('precioMensual')}"`)
  ok(document.activeElement === input('nombre'), 'hace foco en el primer campo con error')
  setInput('precioMensual', '-5')
  setInput('nombre', 'x'.repeat(101))
  submit()
  ok(await esperar(() => helper('precioMensual') === 'El precio no puede ser negativo'), `precio -5 → "${helper('precioMensual')}"`)
  ok(helper('nombre') === 'Máximo 100 caracteres', `nombre de 101 → "${helper('nombre')}"`)
  setInput('precioMensual', '12,345')
  submit()
  ok(await esperar(() => helper('precioMensual') === 'Ingresá un número, con hasta 2 decimales'), `"12,345" → "${helper('precioMensual')}"`)

  paso('[3] Alta válida, con botón deshabilitado mientras guarda')
  setInput('nombre', `  ${NOMBRE}  `)
  setInput('precioMensual', '12500,50')
  escribir(document.querySelector('textarea[name="descripcion"]'), 'Vóley mixto para adolescentes')
  red.lenta()
  submit()
  const btn = () => document.querySelector('form button[type="submit"]')
  ok(await esperar(() => btn()?.textContent === 'Guardando...' && btn().disabled), 'botón "Guardando..." y deshabilitado')
  ok(await esperar(() => location.pathname.startsWith('/actividades/') && h1() === NOMBRE), `redirige al detalle con el nombre sin espacios (${h1()})`)
  red.normal()
  const idCreada = location.pathname.split('/')[2]
  ok(texto().includes(`Actividad creada: ${NOMBRE}`), 'toast "Actividad creada"')
  ok(dato('Precio mensual')?.replace(/\s/g, ' ') === '$ 12.500,50', `precio con coma decimal → "${dato('Precio mensual')}"`)
  ok(dato('Descripción') === 'Vóley mixto para adolescentes', 'descripción guardada')
  ok(await esperar(() => texto().includes('Todavía no tiene comisiones')), 'comisiones: estado vacío')
  ok(document.querySelector('.MuiBreadcrumbs-root')?.textContent === `Actividades/${NOMBRE}`, 'breadcrumbs: Actividades / nombre')

  paso('[4] Alta con nombre duplicado → error del back debajo del nombre')
  await irA('/actividades/nueva')
  await esperar(() => input('nombre')?.value === '')
  setInput('nombre', NOMBRE)
  setInput('precioMensual', '100')
  submit()
  ok(await esperar(() => helper('nombre').startsWith('Ya existe una actividad registrada con el nombre')), `"${helper('nombre')}"`)
  ok(location.pathname === '/actividades/nueva' && input('precioMensual').value === '100', 'se queda en el formulario sin perder lo escrito')

  paso('[5] Edición')
  const otra = await client.api('/api/actividades', { method: 'POST', body: { nombre: `${PREFIJO} Básquet`, precioMensual: 9000 } })
  await irA(`/actividades/${idCreada}/editar`)
  ok(await esperar(() => input('nombre')?.value === NOMBRE), 'carga los datos de la actividad')
  ok(input('precioMensual').value === '12500,5', `precio con coma para editar ("${input('precioMensual').value}")`)
  setInput('nombre', otra.nombre)
  submit()
  ok(await esperar(() => helper('nombre') === `El nombre '${otra.nombre}' ya está en uso.`), `renombrar a uno existente → "${helper('nombre')}"`)
  setInput('nombre', NOMBRE)
  setInput('precioMensual', '15000')
  escribir(document.querySelector('textarea[name="descripcion"]'), '')
  submit()
  ok(await esperar(() => location.pathname === `/actividades/${idCreada}` && texto().includes('Cambios guardados')), 'guarda y vuelve al detalle con toast')
  ok(await esperar(() => dato('Precio mensual')?.replace(/\s/g, ' ') === '$ 15.000,00'), `precio actualizado → "${dato('Precio mensual')}"`)
  ok(dato('Descripción') === '—', `descripción vaciada → "${dato('Descripción')}"`)
  ok((await client.api(`/api/actividades/${idCreada}`)).descripcion === null, 'el back devuelve descripcion = null')
  const [[enBase]] = sql(`SELECT coalesce(descripcion, '<null>') FROM actividades WHERE actividad_id = '${idCreada}';`)
  ok(enBase === '<null>', `en la base: descripcion = ${enBase}`)

  paso('[6] Búsqueda (sin tildes ni mayúsculas)')
  await irA('/actividades')
  await buscar(`${PREFIJO.toLowerCase()} voley`)
  ok(await esperar(() => filas() === 1 && filaDe(NOMBRE)), '"…voley" encuentra "…Vóley"')
  ok(location.search.startsWith('?q='), `la búsqueda queda en la URL (${decodeURIComponent(location.search)})`)
  await buscar(`${PREFIJO} natación`)
  ok(await esperar(() => texto().includes('No hay actividades que coincidan')), 'sin resultados → estado vacío')
  boton('Limpiar filtros').click()
  ok(await esperar(() => location.search === '' && filas() > 0), '"Limpiar filtros" vuelve al listado')

  paso('[7] Paginación (10 actividades más por API)')
  for (let i = 1; i <= 10; i++) {
    await client.api('/api/actividades', { method: 'POST', body: { nombre: `${PREFIJO} Pag${String(i).padStart(2, '0')}`, precioMensual: i * 1000 } })
  }
  await irA('/personas')
  await irA('/actividades')
  const rango = () => document.querySelector('.MuiTablePagination-displayedRows')?.textContent
  ok(await esperar(() => filas() === 10 && rango()?.startsWith('1–10 de ')), `página 1: 10 filas, "${rango()}"`)
  document.querySelector('button[aria-label*="siguiente"]').click()
  ok(await esperar(() => location.search === '?pagina=1' && filas() >= 1), `página 2 (${filas()} filas)`)

  paso('[8] Baja en cascada desde el detalle')
  const c1 = await client.api(`/api/comisiones?actividadId=${idCreada}&nombre=Turno%20Mañana&horario=Sábados%2010:00&cupo=12`, { method: 'POST' })
  await client.api(`/api/comisiones?actividadId=${idCreada}&nombre=Turno%20Tarde&horario=Sábados%2016:00`, { method: 'POST' })
  await client.api('/api/personas', { method: 'POST', body: { dni: DNI, nombre: 'Cascada', apellido: 'TEST-FRONT' } })
  await client.api(`/api/inscripciones?dni=${DNI}&comisionId=${c1.comisionId}`, { method: 'POST' })
  await irA(`/actividades/${idCreada}`)
  ok(await esperar(() => filas() === 2 && texto().includes('Turno Mañana') && texto().includes('Sin tope')), 'el detalle lista las 2 comisiones (cupo 12 y "Sin tope")')
  boton('Dar de baja').click()
  ok(await esperar(() => dialogo()?.textContent.includes('También se van a dar de baja sus 2 comisiones activas y todas sus inscripciones.')), 'el modal avisa la cascada: "sus 2 comisiones activas"')
  red.lenta()
  boton('Dar de baja', dialogo()).click()
  ok(await esperar(() => boton('Dando de baja...', dialogo())?.disabled), 'botón "Dando de baja..." deshabilitado')
  ok(await esperar(() => !dialogo() && texto().includes(`Se dio de baja la actividad ${NOMBRE}`)), 'toast "Se dio de baja la actividad"')
  red.normal()
  ok(await esperar(() => texto().includes('Esta actividad está dada de baja') && [...document.querySelectorAll('tbody tr')].every((tr) => tr.textContent.includes('Inactiva'))), 'sin recargar: aviso y las 2 comisiones "Inactiva"')
  ok((await client.api(`/api/inscripciones/socio/${DNI}`)).length === 0, 'el back dio de baja la inscripción del socio')

  paso('[9] Reactivar (las comisiones no vuelven solas)')
  boton('Reactivar').click()
  ok(await esperar(() => texto().includes(`Se reactivó la actividad ${NOMBRE}`) && boton('Dar de baja')), 'Reactivar → toast y vuelve a ofrecer "Dar de baja"')
  ok([...document.querySelectorAll('tbody tr')].every((tr) => tr.textContent.includes('Inactiva')), 'las comisiones siguen inactivas, como avisa el detalle')

  paso('[10] Baja desde el listado, sin comisiones')
  await irA('/actividades')
  await buscar(otra.nombre)
  await esperar(() => filaDe(otra.nombre))
  document.querySelector(`button[aria-label="Dar de baja ${otra.nombre}"]`).click()
  ok(await esperar(() => dialogo()?.textContent.includes('No tiene comisiones activas.')), 'el modal dice "No tiene comisiones activas."')
  boton('Cancelar', dialogo()).click()
  ok(await esperar(() => !dialogo()) && !!filaDe(otra.nombre), 'Cancelar no la da de baja')
  document.querySelector(`button[aria-label="Dar de baja ${otra.nombre}"]`).click()
  await esperar(() => dialogo()?.textContent.includes('No tiene comisiones activas.'))
  boton('Dar de baja', dialogo()).click()
  ok(await esperar(() => !dialogo() && !filaDe(otra.nombre) && texto().includes('No hay actividades que coincidan')), 'con el filtro "Activas" desaparece del listado')
  boton('Limpiar filtros').click()
  await irA(`/actividades?estado=inactivas&q=${encodeURIComponent(otra.nombre)}`)
  ok(await esperar(() => filaDe(otra.nombre)?.textContent.includes('Inactiva')), 'con el filtro "Inactivas" aparece como Inactiva')

  paso('[11] Error con reintentar')
  const pag = (await client.api('/api/actividades')).find((a) => a.nombre === `${PREFIJO} Pag01`)
  red.caida()
  await irA(`/actividades/${pag.actividadId}`) // detalle que no está en caché
  ok(await esperar(() => texto().includes('No se pudo conectar con el servidor') && !!boton('Reintentar'), 15000), 'back caído → mensaje entendible + Reintentar')
  red.normal()
  boton('Reintentar').click()
  ok(await esperar(() => h1() === `${PREFIJO} Pag01`), 'Reintentar → carga el detalle')

  paso('[12] Detalle inexistente / link inválido')
  await irA('/actividades/abc')
  ok(await esperar(() => texto().includes('No existe la actividad') && texto().includes('El link no es válido.')), '/actividades/abc → "No existe la actividad"')
  await irA('/actividades/00000000-0000-0000-0000-000000000000')
  ok(await esperar(() => texto().includes('Actividad no encontrada')), 'UUID inexistente → mensaje del back')
  ok(!boton('Reintentar') && !!boton('Volver al listado'), 'sin "Reintentar", con "Volver al listado"')

  paso('[13] Menú y consola')
  ok(document.querySelector('a.Mui-selected')?.textContent === 'Actividades', '"Actividades" resaltado en el menú')
  b.sinErroresDeReact()
} catch (e) {
  b.fallar(e.stack ?? e)
} finally {
  red.normal()
  // Limpieza: solo lo de esta corrida (prefijo con el id de la corrida). Mismo orden que
  // scripts/sql/limpiar-actividades-test-front.sql, más el socio de la cascada.
  try {
    const filasSql = sql(`
      BEGIN;
      CREATE TEMP TABLE obj ON COMMIT DROP AS SELECT actividad_id FROM actividades WHERE nombre LIKE '${PREFIJO} %';
      CREATE TEMP TABLE obj_c ON COMMIT DROP AS SELECT comision_id FROM comisiones WHERE actividad_id IN (SELECT actividad_id FROM obj);
      CREATE TEMP TABLE obj_p ON COMMIT DROP AS SELECT persona_id FROM personas WHERE apellido = 'TEST-FRONT' AND dni = '${DNI}';
      SELECT 'borradas', (SELECT count(*) FROM obj), (SELECT count(*) FROM obj_c), (SELECT count(*) FROM obj_p);
      DELETE FROM asistencias WHERE inscripcion_id IN (SELECT inscripcion_id FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM obj_c) OR persona_id IN (SELECT persona_id FROM obj_p));
      DELETE FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM obj_c) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM comisiones WHERE comision_id IN (SELECT comision_id FROM obj_c);
      DELETE FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM obj) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM actividades WHERE actividad_id IN (SELECT actividad_id FROM obj);
      DELETE FROM membresias WHERE persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM personas WHERE persona_id IN (SELECT persona_id FROM obj_p);
      COMMIT;
      SELECT 'restantes', (SELECT count(*) FROM actividades WHERE nombre LIKE '${PREFIJO} %'), (SELECT count(*) FROM personas WHERE dni = '${DNI}' AND apellido = 'TEST-FRONT');`)
    const [, actividades, comisiones, personas] = filasSql.find((f) => f[0] === 'borradas')
    const [, restA, restP] = filasSql.find((f) => f[0] === 'restantes')
    console.log(`\n[limpieza] borradas ${actividades} actividades, ${comisiones} comisiones y ${personas} persona; quedan ${restA} y ${restP}`)
    if (restA !== '0' || restP !== '0') b.fallar('la limpieza dejó datos de prueba')
  } catch (e) {
    b.fallar(`limpieza: ${e.message}`)
  }
  await b.terminar()
}
