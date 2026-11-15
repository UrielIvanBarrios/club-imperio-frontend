// E2E: Inscribir socio contra el back real: búsqueda por DNI o nombre, comisiones con su cupo libre,
// llegada desde el socio y desde la comisión con el dato precargado, y los cuatro rechazos del back
// (cupo agotado, ya inscripto, comisión y persona dadas de baja) debajo de su campo.
// Todo lo que crea lleva el prefijo "TEST-FRONT <corrida>" (actividades) o apellido TEST-FRONT
// con DNI 99xxxxxx (socios), y se borra al final por SQL.
import { sql } from './lib/config.mjs'
import { crearNavegador, pausa } from './lib/harness.mjs'

const b = await crearNavegador('/inscripciones')
const { ok, paso, texto, esperar, input, escribir, helper, boton, submit, irA, h1, client, red, abrirSelect, opciones, cerrarMenu } = b

const CORRIDA = Date.now().toString(36).toUpperCase()
const PREFIJO = `TEST-FRONT ${CORRIDA}`
const base = 99000000 + Math.floor(Math.random() * 900000)
const DNIS = [0, 1, 2, 3].map((i) => String(base + i))

const filaDe = (txt) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(txt))
const etiquetas = () => document.querySelectorAll('.MuiTypography-caption')
const dato = (label) => [...etiquetas()].find((c) => c.textContent === label)?.nextSibling?.textContent
// Opciones de los select de MUI (actividad / comisión), por cómo empieza su texto
const opcion = (prefijo) => [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.startsWith(prefijo))
const elegirOpcion = async (name, prefijo) => {
  abrirSelect(name)
  await esperar(() => opcion(prefijo))
  opcion(prefijo).click()
  await esperar(() => !document.querySelector('[role="listbox"]'))
}
// Autocomplete del socio: se tipea y se elige de la lista que despliega
const buscarSocio = async (txt) => {
  input('personaId').focus()
  escribir(input('personaId'), txt)
  await pausa(50)
}
const elegirSocio = async (txt, opcionTxt) => {
  await buscarSocio(txt)
  await esperar(() => opcion(opcionTxt))
  opcion(opcionTxt).click()
  await esperar(() => !document.querySelector('[role="listbox"]'))
}
const api = (path, method = 'POST') => client.api(path, { method })

try {
  await b.sesionAdmin()
  // ---------- datos de partida (por API) ----------
  const natacion = await client.api('/api/actividades', { method: 'POST', body: { nombre: `${PREFIJO} Natación`, precioMensual: 15000 } })
  const baja = await client.api('/api/actividades', { method: 'POST', body: { nombre: `${PREFIJO} Dada de baja`, precioMensual: 1 } })
  await api(`/api/actividades/${baja.actividadId}`, 'DELETE')
  const comision = (nombre, horario, cupo) =>
    api(`/api/comisiones?${new URLSearchParams({ actividadId: natacion.actividadId, nombre, horario, ...(cupo ? { cupo: String(cupo) } : {}) })}`)
  const uno = await comision('Uno', 'Lunes 18:00', 1)
  await comision('Tres', 'Martes 18:00', 3)
  const libre = await comision('Libre', 'Miércoles 18:00')
  const carrera = await comision('Carrera', 'Jueves 18:00', 1)
  const aBorrar = await comision('Se da de baja', 'Viernes 18:00', 5)
  const cerrada = await comision('Cerrada', 'Sábado 18:00', 5)
  await api(`/api/comisiones/${cerrada.comisionId}`, 'DELETE')
  const [joaquin, , beto, carla] = await Promise.all(
    ['Joaquín', 'Ana', 'Beto', 'Carla'].map((nombre, i) => client.api('/api/personas', { method: 'POST', body: { dni: DNIS[i], nombre, apellido: 'TEST-FRONT' } })),
  )
  await api(`/api/personas/${carla.personaId}`, 'DELETE')

  paso('[1] Formulario vacío: skeleton, obligatorios')
  await b.montarApp()
  ok(await esperar(() => document.querySelector('[aria-busy="true"]')), 'muestra el skeleton mientras carga')
  ok(await esperar(() => h1() === 'Inscribir socio' && input('personaId')), 'muestra el formulario')
  ok(helper('comisionId') === 'Primero elegí la actividad' && !!input('comisionId').closest('.Mui-disabled'), 'la comisión espera a que se elija la actividad')
  submit()
  ok(await esperar(() => helper('personaId') === 'Elegí el socio' && helper('actividadId') === 'Elegí la actividad' && helper('comisionId') === 'Elegí la comisión'), 'socio, actividad y comisión obligatorios')

  paso('[2] Búsqueda del socio por DNI o nombre')
  await buscarSocio(DNIS[0].slice(0, 6))
  ok(await esperar(() => opcion('TEST-FRONT, Joaquín')), 'parte del DNI encuentra al socio')
  await buscarSocio('joaquin test')
  ok(await esperar(() => opcion('TEST-FRONT, Joaquín')), '"joaquin" sin tilde encuentra a "Joaquín"')
  await buscarSocio(DNIS[3])
  ok(await esperar(() => opcion('TEST-FRONT, Carla')), 'la persona dada de baja aparece...')
  ok(opcion('TEST-FRONT, Carla').getAttribute('aria-disabled') === 'true' && opcion('TEST-FRONT, Carla').textContent.includes('Dada de baja: no se puede inscribir'), '...pero deshabilitada, con la explicación')
  await buscarSocio('zzz-no-existe')
  ok(await esperar(() => texto().includes('No hay personas con ese DNI o nombre')), 'sin coincidencias → "No hay personas con ese DNI o nombre"')

  paso('[3] Alta: actividades activas y comisiones con su cupo libre')
  await elegirSocio(DNIS[0], 'TEST-FRONT, Joaquín')
  ok(input('personaId').value === `TEST-FRONT, Joaquín · DNI ${DNIS[0]}`, 'socio elegido')
  abrirSelect('actividadId')
  ok(await esperar(() => opciones().includes(natacion.nombre)), 'ofrece las actividades activas')
  ok(!opciones().includes(baja.nombre), 'no ofrece las dadas de baja')
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))
  await elegirOpcion('actividadId', natacion.nombre)
  abrirSelect('comisionId')
  ok(await esperar(() => opcion('Uno')?.textContent === 'Uno · Lunes 18:00 — 1 lugar libre de 1'), `cupo libre: "${opcion('Uno')?.textContent}"`)
  ok(opcion('Libre')?.textContent === 'Libre · Miércoles 18:00 — Sin tope de cupo', `sin tope: "${opcion('Libre')?.textContent}"`)
  ok(!opcion('Cerrada'), 'no ofrece las comisiones dadas de baja')
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))
  await elegirOpcion('comisionId', 'Tres')
  ok(await esperar(() => helper('comisionId') === 'Martes 18:00 · 3 lugares libres de 3'), `ayuda de la comisión elegida: "${helper('comisionId')}"`)
  red.lenta()
  submit()
  const btn = () => document.querySelector('form button[type="submit"]')
  ok(await esperar(() => btn()?.textContent === 'Inscribiendo...' && btn().disabled), 'botón "Inscribiendo..." y deshabilitado')
  ok(await esperar(() => location.pathname === `/personas/${joaquin.personaId}`), 'sin origen, va al detalle del socio')
  red.normal()
  ok(await esperar(() => texto().includes(`Se inscribió a Joaquín TEST-FRONT en ${natacion.nombre} · Tres`)), 'toast con socio, actividad y comisión')
  ok(await esperar(() => !!filaDe('Martes 18:00')), 'el socio muestra la inscripción nueva')

  paso('[4] Desde el detalle del socio: el socio viene elegido')
  ok(boton('Inscribir')?.getAttribute('href') === `/inscripciones?persona=${joaquin.personaId}`, 'botón "Inscribir" en el detalle del socio')
  boton('Inscribir').click()
  ok(await esperar(() => location.search === `?persona=${joaquin.personaId}` && input('personaId')?.value.startsWith('TEST-FRONT, Joaquín')), 'el formulario abre con el socio elegido')
  ok(document.querySelector('.MuiBreadcrumbs-root')?.textContent === 'Personas/TEST-FRONT, Joaquín/Inscribir', 'breadcrumbs: Personas / socio / Inscribir')
  await elegirOpcion('actividadId', natacion.nombre)
  abrirSelect('comisionId')
  ok(await esperar(() => opcion('Tres')?.textContent === 'Tres · Martes 18:00 — Ya está inscripto'), `la comisión donde ya está: "${opcion('Tres')?.textContent}"`)
  ok(opcion('Tres').getAttribute('aria-disabled') === 'true', 'y no se puede elegir')
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))
  boton('Cancelar').click()
  ok(await esperar(() => location.pathname === `/personas/${joaquin.personaId}`), 'Cancelar vuelve al socio')

  paso('[5] Desde el detalle de la comisión: actividad y comisión vienen elegidas')
  await irA(`/comisiones/${uno.comisionId}`)
  ok(await esperar(() => boton('Inscribir socio')?.getAttribute('href') === `/inscripciones?comision=${uno.comisionId}`), 'botón "Inscribir socio" en el detalle de la comisión')
  boton('Inscribir socio').click()
  ok(await esperar(() => input('actividadId')?.value === natacion.actividadId && input('comisionId')?.value === uno.comisionId), 'el formulario abre con la actividad y la comisión elegidas')
  ok(document.querySelector('.MuiBreadcrumbs-root')?.textContent === `Comisiones/${natacion.nombre} · Uno/Inscribir socio`, 'breadcrumbs: Comisiones / comisión / Inscribir socio')
  await elegirSocio('ana test', 'TEST-FRONT, Ana')
  submit()
  ok(await esperar(() => location.pathname === `/comisiones/${uno.comisionId}`), 'vuelve al detalle de la comisión')
  ok(await esperar(() => texto().includes(`Se inscribió a Ana TEST-FRONT en ${natacion.nombre} · Uno`)), 'toast de la inscripción')
  ok(await esperar(() => dato('Cupo')?.startsWith('1 / 1 ocupados · Completa') && !!filaDe('TEST-FRONT, Ana')), `la comisión la lista y queda completa: "${dato('Cupo')}"`)

  paso('[6] Comisión completa: se ve, pero no se puede elegir')
  await irA('/inscripciones')
  await esperar(() => input('personaId'))
  await elegirSocio('beto', 'TEST-FRONT, Beto')
  await elegirOpcion('actividadId', natacion.nombre)
  abrirSelect('comisionId')
  ok(await esperar(() => opcion('Uno')?.textContent === 'Uno · Lunes 18:00 — Completa (1 / 1)' && opcion('Uno').getAttribute('aria-disabled') === 'true'), `"${opcion('Uno')?.textContent}" deshabilitada`)
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))

  paso('[7] Rechazos del back (algo cambió con el formulario abierto): cada uno en su campo')
  // a) otro ocupó el último lugar
  await elegirOpcion('comisionId', 'Carrera')
  await api(`/api/inscripciones?dni=${DNIS[0]}&comisionId=${carrera.comisionId}`)
  submit()
  ok(await esperar(() => helper('comisionId') === 'Cupo agotado para la comisión: Carrera'), `cupo agotado: "${helper('comisionId')}"`)
  ok(location.pathname === '/inscripciones', 'se queda en el formulario')
  abrirSelect('comisionId')
  ok(await esperar(() => opcion('Carrera')?.textContent.endsWith('Completa (1 / 1)')), 'las opciones se actualizan: Carrera ahora figura completa')
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))
  // b) otro lo inscribió en la misma comisión
  await elegirOpcion('comisionId', 'Libre')
  await api(`/api/inscripciones?dni=${DNIS[2]}&comisionId=${libre.comisionId}`)
  submit()
  ok(await esperar(() => helper('comisionId') === 'El socio ya está inscripto en esta comisión.'), `ya inscripto: "${helper('comisionId')}"`)
  // c) dieron de baja la comisión
  await elegirOpcion('comisionId', 'Se da de baja')
  await api(`/api/comisiones/${aBorrar.comisionId}`, 'DELETE')
  submit()
  ok(await esperar(() => helper('comisionId') === 'La comision seleccionada no esta activa.'), `comisión dada de baja: "${helper('comisionId')}"`)
  // d) dieron de baja al socio
  await elegirOpcion('comisionId', 'Tres')
  await api(`/api/personas/${beto.personaId}`, 'DELETE')
  submit()
  ok(await esperar(() => helper('personaId') === 'La persona seleccionada no esta activa.'), `persona dada de baja: "${helper('personaId')}" (en el campo del socio)`)
  ok((await client.api(`/api/inscripciones/socio/${DNIS[2]}`)).length === 1, 'el back no guardó ninguna de las rechazadas (Beto sigue con 1 inscripción)')

  paso('[8] Error con reintentar')
  red.caida()
  await irA(`/inscripciones?comision=${libre.comisionId}`) // la comisión no está en caché
  ok(await esperar(() => texto().includes('No se pudo conectar con el servidor') && !!boton('Reintentar'), 15000), 'back caído → mensaje entendible + Reintentar')
  red.normal()
  boton('Reintentar').click()
  ok(await esperar(() => input('comisionId')?.value === libre.comisionId), 'Reintentar → formulario con la comisión precargada')

  paso('[9] Menú y consola')
  ok(document.querySelector('a.Mui-selected')?.textContent === 'Inscripciones', '"Inscripciones" resaltado en el menú')
  b.sinErroresDeReact()
} catch (e) {
  b.fallar(e.stack ?? e)
} finally {
  red.normal()
  // Limpieza: solo lo de esta corrida. Mismo orden que scripts/sql/limpiar-actividades-test-front.sql
  // (asistencias → inscripciones → comisiones → actividad), más los socios.
  try {
    const dnis = DNIS.map((d) => `'${d}'`).join(',')
    const filasSql = sql(`
      BEGIN;
      CREATE TEMP TABLE obj ON COMMIT DROP AS SELECT actividad_id FROM actividades WHERE nombre LIKE '${PREFIJO} %';
      CREATE TEMP TABLE obj_c ON COMMIT DROP AS SELECT comision_id FROM comisiones WHERE actividad_id IN (SELECT actividad_id FROM obj);
      CREATE TEMP TABLE obj_p ON COMMIT DROP AS SELECT persona_id FROM personas WHERE apellido = 'TEST-FRONT' AND dni IN (${dnis});
      SELECT 'borradas', (SELECT count(*) FROM obj), (SELECT count(*) FROM obj_c), (SELECT count(*) FROM obj_p),
             (SELECT count(*) FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM obj_c) OR persona_id IN (SELECT persona_id FROM obj_p));
      DELETE FROM asistencias WHERE inscripcion_id IN (SELECT inscripcion_id FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM obj_c) OR persona_id IN (SELECT persona_id FROM obj_p));
      DELETE FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM obj_c) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM comisiones WHERE comision_id IN (SELECT comision_id FROM obj_c);
      DELETE FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM obj) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM actividades WHERE actividad_id IN (SELECT actividad_id FROM obj);
      DELETE FROM membresias WHERE persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM personas WHERE persona_id IN (SELECT persona_id FROM obj_p);
      COMMIT;
      SELECT 'restantes', (SELECT count(*) FROM actividades WHERE nombre LIKE '${PREFIJO} %'), (SELECT count(*) FROM personas WHERE apellido = 'TEST-FRONT' AND dni IN (${dnis}));`)
    const [, actividades, comisiones, personas, inscripciones] = filasSql.find((f) => f[0] === 'borradas')
    const [, restA, restP] = filasSql.find((f) => f[0] === 'restantes')
    console.log(`\n[limpieza] borradas ${actividades} actividades, ${comisiones} comisiones, ${inscripciones} inscripciones y ${personas} personas; quedan ${restA} y ${restP}`)
    if (restA !== '0' || restP !== '0') b.fallar('la limpieza dejó datos de prueba')
  } catch (e) {
    b.fallar(`limpieza: ${e.message}`)
  }
  await b.terminar()
}
