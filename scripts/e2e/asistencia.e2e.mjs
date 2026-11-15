// E2E: Tomar asistencia contra el back real: elegir comisión y fecha, marcar con un click, guardar toda la
// clase en un request (todo o nada), clase ya cargada (entera o a medias), el back que rechaza el lote con
// la lista de errores, corregir una asistencia cargada, back caído al guardar, y el historial en el detalle del socio.
// Todo lo que crea lleva el prefijo "TEST-FRONT <corrida>" (actividades) o apellido TEST-FRONT
// con DNI 99xxxxxx (socios), y se borra al final por SQL (asistencias incluidas).
import { sql } from './lib/config.mjs'
import { crearNavegador } from './lib/harness.mjs'

const b = await crearNavegador('/asistencia')
const { ok, paso, texto, esperar, input, escribir, helper, boton, irA, h1, filas, client, red, elegir, dialogo } = b

const CORRIDA = Date.now().toString(36).toUpperCase()
const PREFIJO = `TEST-FRONT ${CORRIDA}`
const base = 99000000 + Math.floor(Math.random() * 900000)
const DNIS = [0, 1, 2, 3, 4, 5].map((i) => String(base + i))

// Fechas en hora local, como las arma el front
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
const [HOY, AYER, ANTEAYER, MANIANA] = [dia(0), dia(-1), dia(-2), dia(1)]
const fmt = (s) => s.split('-').reverse().join('/')

const filaDe = (txt) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(txt))
const marcar = (alumno, valor) => boton(valor, filaDe(`TEST-FRONT, ${alumno}`)).click()
const marcado = (alumno) => filaDe(`TEST-FRONT, ${alumno}`)?.querySelector('button[aria-pressed="true"]')?.textContent ?? null
const corregirBtn = (alumno) => document.querySelector(`button[aria-label="Corregir la asistencia de TEST-FRONT, ${alumno}"]`)
const estado = () => [...document.querySelectorAll('p')].find((p) => p.getAttribute('aria-live') === 'polite')?.textContent
const guardarBtn = () => boton('Guardar asistencia') ?? boton('Guardando...')
const alerta = (sev) => document.querySelector(`.MuiAlert-color${sev}`)?.textContent ?? ''
const erroresLote = () => [...document.querySelectorAll('.MuiAlert-colorError li')].map((li) => li.textContent)
const registrar = (inscripcionId, fecha, presente) =>
  client.api(`/api/asistencias?${new URLSearchParams({ inscripcionId, fecha, presente: String(presente) })}`, { method: 'POST' })
const deClase = (comisionId, fecha) => client.api(`/api/asistencias/comision/${comisionId}?fecha=${fecha}`)
const historial = (inscripcionId) => client.api(`/api/asistencias/historial/${inscripcionId}`)
const inscribir = (dni, comisionId) => client.api(`/api/inscripciones?dni=${dni}&comisionId=${comisionId}`, { method: 'POST' })
// El back no acepta asistencias anteriores a la inscripción: las inscripciones de prueba se "antedatan" por SQL
const antedatar = (lista) =>
  sql(`UPDATE inscripciones SET fecha_inscripcion = current_date - 30 WHERE inscripcion_id IN (${lista.map((i) => `'${i.inscripcionId}'`).join(',')});`)

// Anota los requests de la app al back (sobre lo que haya puesto red.lenta / red.caida; red.normal lo saca)
const espiar = () => {
  const pedidos = []
  const anterior = globalThis.fetch
  globalThis.fetch = (url, init) => {
    pedidos.push(`${init?.method ?? 'GET'} ${new URL(String(url)).pathname}`)
    return anterior(url, init)
  }
  return pedidos
}

try {
  await b.sesionAdmin()
  // ---------- datos de partida (por API) ----------
  const futbol = await client.api('/api/actividades', { method: 'POST', body: { nombre: `${PREFIJO} Fútbol`, precioMensual: 12000 } })
  const comision = (nombre, horario) =>
    client.api(`/api/comisiones?${new URLSearchParams({ actividadId: futbol.actividadId, nombre, horario })}`, { method: 'POST' })
  const planilla = await comision('Planilla', 'Lunes 18:00')
  const vacia = await comision('Vacía', 'Martes 18:00')
  const otra = await comision('Otra', 'Jueves 18:00')
  const cerrada = await comision('Cerrada', 'Viernes 18:00')
  await client.api(`/api/comisiones/${cerrada.comisionId}`, { method: 'DELETE' })
  const alumnos = await Promise.all(
    // Alumno1 es socio (con membresía): está en todas las clases de la planilla, así cubre que el back arme bien
    // el lote, la clase y el historial de una persona socia
    ['Alumno1', 'Alumno2', 'Alumno3', 'Alumno4', 'Alumno5', 'Alumno6'].map((nombre, i) =>
      client.api('/api/personas', { method: 'POST', body: { dni: DNIS[i], nombre, apellido: 'TEST-FRONT', seAsocia: i === 0 } })),
  )
  const ins = []
  for (const dni of DNIS.slice(0, 3)) ins.push(await inscribir(dni, planilla.comisionId))
  ins.push(await inscribir(DNIS[0], otra.comisionId))
  antedatar(ins)
  const urlPlanilla = (fecha) => `/asistencia?actividad=${futbol.actividadId}&comision=${planilla.comisionId}${fecha ? `&fecha=${fecha}` : ''}`

  paso('[1] Sin comisión elegida')
  await b.montarApp()
  ok(await esperar(() => h1() === 'Tomar asistencia' && input('fecha')), 'muestra la pantalla')
  ok(texto().includes('Elegí la comisión y la fecha de la clase'), 'estado vacío: elegí la comisión y la fecha')
  ok(input('fecha').value === HOY && helper('fecha') === 'Hoy', 'la fecha arranca en hoy')
  ok(helper('comision') === 'Primero elegí la actividad' && !!input('comision').closest('.Mui-disabled'), 'la comisión espera a la actividad')

  paso('[2] Elegir actividad y comisión → planilla con los inscriptos activos')
  await elegir('actividad', futbol.nombre)
  ok(await esperar(() => new URLSearchParams(location.search).get('actividad') === futbol.actividadId), 'la actividad queda en la URL')
  ok(await esperar(() => !input('comision').closest('.Mui-disabled')), 'cargadas sus comisiones, se habilita la comisión')
  const pedidosAlAbrir = espiar()
  await elegir('comision', 'Planilla · Lunes 18:00')
  ok(await esperar(() => filas() === 3), 'lista los 3 inscriptos')
  ok(new URLSearchParams(location.search).get('comision') === planilla.comisionId, 'la comisión queda en la URL')
  ok(document.querySelector('tbody tr td')?.textContent === 'TEST-FRONT, Alumno1', 'ordenados por apellido y nombre')
  ok(texto().includes(`Lunes 18:00 · Clase del ${fmt(HOY)}`), 'encabezado con horario y fecha de la clase')
  ok(estado() === 'Faltan marcar 3 de 3' && guardarBtn()?.disabled, `"${estado()}" y Guardar deshabilitado`)
  ok(pedidosAlAbrir.includes(`GET /api/asistencias/comision/${planilla.comisionId}`) && !pedidosAlAbrir.some((p) => p.includes('/historial/')),
    'lo cargado de la clase sale de un GET por comisión y fecha, sin pedir el historial de cada inscripto')
  red.normal()

  paso('[3] Marcar con un click y guardar toda la clase en un request')
  marcar('Alumno1', 'Presente')
  ok(await esperar(() => marcado('Alumno1') === 'Presente' && estado() === 'Faltan marcar 2 de 3'), 'un click marca Presente')
  marcar('Alumno1', 'Ausente')
  ok(await esperar(() => marcado('Alumno1') === 'Ausente'), 'otro click lo cambia a Ausente')
  marcar('Alumno1', 'Ausente')
  ok(await esperar(() => marcado('Alumno1') === 'Ausente'), 'tocar el mismo no lo desmarca')
  boton('Todos presentes').click()
  ok(await esperar(() => estado() === '3 presentes y 0 ausentes' && !guardarBtn().disabled), `"Todos presentes" → "${estado()}"`)
  marcar('Alumno2', 'Ausente')
  ok(await esperar(() => estado() === '2 presentes y 1 ausente'), `excepción → "${estado()}"`)
  red.lenta()
  const pedidosAlGuardar = espiar()
  guardarBtn().click()
  ok(await esperar(() => boton('Guardando...')?.disabled && boton('Presente', filaDe('Alumno3')).disabled), '"Guardando..." y las marcas bloqueadas')
  ok(await esperar(() => texto().includes('Asistencia guardada: 2 presentes y 1 ausente')), 'toast con el resumen')
  red.normal()
  const posts = pedidosAlGuardar.filter((p) => p.startsWith('POST'))
  ok(posts.join() === 'POST /api/asistencias/clase', `un solo POST para toda la clase (${JSON.stringify(posts)})`)
  ok(await esperar(() => alerta('Info').includes('La asistencia de esta clase ya se cargó') && alerta('Info').includes(`${fmt(HOY)}: 2 presentes y 1 ausente`)), 'la planilla pasa a "ya se cargó"')
  ok(alerta('Info').includes('Para corregir a alguien, usá "Corregir" en su fila.') && !guardarBtn() && !boton('Todos presentes'), 'sin botones de guardar, con la indicación de cómo corregir')
  ok(filaDe('Alumno2').textContent.includes('AusenteYa cargada') && !!corregirBtn('Alumno2'), 'cada fila muestra lo guardado y "Corregir"')
  const h2 = await historial(ins[1].inscripcionId)
  ok(h2.length === 1 && h2[0].fecha === HOY && h2[0].presente === false, 'el back guardó a Alumno2 ausente en la fecha elegida')
  const deHoy = await deClase(planilla.comisionId, HOY)
  const h1Socio = await historial(ins[0].inscripcionId)
  ok(deHoy.find((a) => a.inscripcion.persona.dni === DNIS[0])?.inscripcion.persona.esSocioActivo === true && h1Socio[0]?.inscripcion.persona.esSocioActivo === true,
    'con un socio en la clase, el GET de la clase y el historial devuelven JSON válido con esSocioActivo')

  paso('[4] Volver a la misma clase después')
  await irA('/personas')
  await irA(urlPlanilla(HOY))
  ok(await esperar(() => alerta('Info').includes('La asistencia de esta clase ya se cargó')), 'el link con comisión y fecha muestra que ya se cargó')

  paso('[5] Corregir una asistencia cargada')
  corregirBtn('Alumno2').click()
  ok(await esperar(() => dialogo()?.textContent.includes(`TEST-FRONT, Alumno2 figura Ausente en la clase del ${fmt(HOY)}. ¿Cambiarlo a Presente?`)), 'pide confirmación con lo que cambia')
  boton('Cancelar', dialogo()).click()
  ok(await esperar(() => !dialogo()) && filaDe('Alumno2').textContent.includes('AusenteYa cargada'), 'Cancelar no cambia nada')
  corregirBtn('Alumno2').click()
  await esperar(() => dialogo() && boton('Cambiar a Presente', dialogo()))
  red.caida()
  boton('Cambiar a Presente', dialogo()).click()
  ok(await esperar(() => dialogo()?.textContent.includes('No se pudo conectar con el servidor'), 15000), 'back caído → error en el diálogo, que sigue abierto')
  red.normal()
  boton('Cambiar a Presente', dialogo()).click()
  ok(await esperar(() => texto().includes('Se corrigió la asistencia de TEST-FRONT, Alumno2: Presente') && !dialogo()), 'reintentar corrige: toast y se cierra')
  ok(await esperar(() => filaDe('Alumno2').textContent.includes('PresenteYa cargada') && alerta('Info').includes('3 presentes y 0 ausentes')), 'la fila y el resumen se actualizan')
  const corregida = (await deClase(planilla.comisionId, HOY)).find((a) => a.inscripcion.inscripcionId === ins[1].inscripcionId)
  ok(corregida?.presente === true && corregida.asistenciaId === h2[0].asistenciaId, 'el back corrigió la misma asistencia (no creó otra)')
  corregirBtn('Alumno2').click()
  await esperar(() => dialogo() && boton('Cambiar a Ausente', dialogo()))
  boton('Cambiar a Ausente', dialogo()).click()
  ok(await esperar(() => !dialogo() && alerta('Info').includes('2 presentes y 1 ausente')), 'y se puede volver a corregir (vuelve a Ausente)')

  paso('[6] Fecha futura')
  escribir(input('fecha'), MANIANA)
  ok(await esperar(() => helper('fecha') === 'No se puede tomar asistencia de una fecha futura' && filas() === 0), 'mañana → error en el campo y sin planilla')

  paso('[7] Clase cargada a medias, y el back rechaza el lote con la lista de errores')
  ins.push(await inscribir(DNIS[3], planilla.comisionId)) // ins[4]: Alumno4
  ins.push(await inscribir(DNIS[4], planilla.comisionId)) // ins[5]: Alumno5, inscripto hoy (no se antedata)
  antedatar([ins[4]])
  await registrar(ins[4].inscripcionId, ANTEAYER, true) // Alumno4 tiene la de anteayer (para el paso 8)
  await registrar(ins[0].inscripcionId, AYER, true) // Alumno1 ya tiene la de ayer
  escribir(input('fecha'), AYER)
  ok(await esperar(() => alerta('Warning').includes('ya tiene cargada la asistencia de 1 de 4 inscriptos')), `aviso: ya cargada a medias ("${alerta('Warning')}")`)
  ok(await esperar(() => filaDe('Alumno1')?.textContent.includes('PresenteYa cargada') && estado() === 'Faltan marcar 3 de 3'), 'la ya cargada no se marca; faltan las otras 3')
  ok(filaDe('Alumno5')?.textContent.includes(`Se inscribió el ${fmt(HOY)}`) && !boton('Presente', filaDe('Alumno5')), 'quien se inscribió después de la clase no se marca')
  boton('Todos presentes').click()
  await esperar(() => estado() === '3 presentes y 0 ausentes')
  // "Desde otra compu", antes de que se guarde: cargan a Alumno2 y dan de baja la inscripción de Alumno4
  await registrar(ins[1].inscripcionId, AYER, false)
  await client.api(`/api/inscripciones/${ins[4].inscripcionId}`, { method: 'DELETE' })
  guardarBtn().click()
  ok(await esperar(() => alerta('Error').includes('No se guardó ninguna asistencia')), 'error: no se guardó ninguna')
  ok(JSON.stringify(erroresLote()) === JSON.stringify([
    `TEST-FRONT, Alumno2: Ya existe un registro de asistencia para este socio en la fecha ${fmt(AYER)}.`,
    'TEST-FRONT, Alumno4: la inscripción está dada de baja.',
  ]), `lista de errores por alumno: ${JSON.stringify(erroresLote())}`)
  ok(alerta('Error').includes('Mientras marcabas, alguien cargó parte de esta clase'), 'explica el duplicado')
  ok((await deClase(planilla.comisionId, AYER)).length === 2, 'todo o nada: Alumno3, que estaba bien, tampoco se guardó')
  ok(await esperar(() => filaDe('Alumno2')?.textContent.includes('AusenteYa cargada') && !filaDe('Alumno4')), 'la planilla se actualiza: Alumno2 cargado, Alumno4 ya no está')
  ok(estado() === '1 presente y 0 ausentes' && !guardarBtn().disabled, `a Alumno3 le queda su marca, listo para volver a guardar ("${estado()}")`)
  guardarBtn().click()
  ok(await esperar(() => texto().includes('Asistencia guardada: 1 presente y 0 ausentes')), 'guarda al que faltaba')
  ok(await esperar(() => alerta('Info').includes(`${fmt(AYER)}: 2 presentes y 1 ausente`) && !alerta('Error')), 'queda toda cargada y se va el error')

  paso('[8] Back caído al guardar: las marcas no se pierden')
  escribir(input('fecha'), ANTEAYER)
  ok(await esperar(() => estado() === 'Faltan marcar 3 de 3' && alerta('Warning').includes('1 de 4')), 'anteayer: falta marcar a 3')
  ok(filaDe('Alumno4')?.textContent.includes('PresenteYa cargada · inscripción dada de baja'), 'se ve la asistencia de una inscripción que después se dio de baja')
  boton('Todos presentes').click()
  marcar('Alumno3', 'Ausente')
  await esperar(() => estado() === '2 presentes y 1 ausente' && !guardarBtn().disabled)
  red.caida()
  guardarBtn().click()
  ok(await esperar(() => alerta('Error').includes('No se guardó ninguna asistenciaNo se pudo conectar con el servidor'), 15000), `error con el motivo ("${alerta('Error')}")`)
  ok(await esperar(() => estado() === '2 presentes y 1 ausente' && !guardarBtn().disabled), 'las marcas siguen ahí, listo para reintentar')
  red.normal()
  guardarBtn().click()
  ok(await esperar(() => texto().includes('Asistencia guardada: 2 presentes y 1 ausente')), 'reintentar guarda')

  paso('[9] Comisión sin inscriptos')
  await elegir('comision', 'Vacía · Martes 18:00')
  ok(await esperar(() => texto().includes('La comisión no tiene inscriptos activos')), 'estado vacío')
  ok(boton('Inscribir socio')?.getAttribute('href') === `/inscripciones?comision=${vacia.comisionId}`, 'con el atajo a inscribir en esa comisión')

  paso('[10] Link con una comisión dada de baja')
  await irA(`/asistencia?actividad=${futbol.actividadId}&comision=${cerrada.comisionId}`)
  ok(await esperar(() => texto().includes('La comisión del link no existe o está dada de baja: elegí otra.')), 'aviso en vez de la planilla')

  paso('[11] Desde el detalle de la comisión')
  await irA(`/comisiones/${planilla.comisionId}`)
  ok(await esperar(() => boton('Tomar asistencia')?.getAttribute('href') === `/asistencia?actividad=${futbol.actividadId}&comision=${planilla.comisionId}`), 'botón "Tomar asistencia" con la comisión elegida')
  boton('Tomar asistencia').click()
  // Hoy: los 3 de antes ya están cargados; falta Alumno5, que se inscribió hoy
  ok(await esperar(() => location.pathname === '/asistencia' && alerta('Warning').includes('3 de 4') && estado() === 'Faltan marcar 1 de 1'), 'abre la planilla de hoy')

  paso('[12] Error con reintentar')
  red.caida()
  await irA(`/asistencia?actividad=${futbol.actividadId}&comision=${otra.comisionId}`) // nada de esta comisión en caché
  ok(await esperar(() => texto().includes('No se pudieron cargar los inscriptos') && !!boton('Reintentar'), 15000), 'back caído → mensaje + Reintentar')
  red.normal()
  boton('Reintentar').click()
  ok(await esperar(() => filas() === 1 && !!filaDe('TEST-FRONT, Alumno1')), 'Reintentar → la planilla')

  paso('[13] Historial en el detalle del socio')
  await irA(`/personas/${alumnos[1].personaId}`) // Alumno2: hoy ausente, ayer ausente, anteayer presente
  ok(await esperar(() => texto().includes(`${futbol.nombre} · Planilla: 1 de 3 clases (33 %)`)), 'resumen: 1 de 3 clases (33 %)')
  const tabla = () => document.querySelector('table[aria-label="Historial de asistencia"]')
  const filasHist = () => [...(tabla()?.querySelectorAll('tbody tr') ?? [])].map((tr) => [...tr.cells].map((c) => c.textContent))
  ok(JSON.stringify(filasHist().map((f) => [f[0], f[2]])) === JSON.stringify([[fmt(HOY), 'Ausente'], [fmt(AYER), 'Ausente'], [fmt(ANTEAYER), 'Presente']]), `más reciente primero: ${JSON.stringify(filasHist())}`)
  await irA(`/personas/${alumnos[0].personaId}`) // Alumno1: 3 de 3 en Planilla, nada en Otra
  ok(await esperar(() => texto().includes(`${futbol.nombre} · Planilla: 3 de 3 clases (100 %)`) && texto().includes(`${futbol.nombre} · Otra: sin clases cargadas`)), 'una línea por inscripción, también la que no tiene clases')
  await irA(`/personas/${alumnos[5].personaId}`) // Alumno6: sin inscripciones
  ok(await esperar(() => texto().includes('Sin asistencia para mostrar')), 'socio sin inscripciones → estado vacío')

  paso('[14] Menú y consola')
  await irA('/asistencia')
  ok(await esperar(() => document.querySelector('a.Mui-selected')?.textContent === 'Asistencia'), '"Asistencia" resaltado en el menú')
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
      CREATE TEMP TABLE obj_i ON COMMIT DROP AS SELECT inscripcion_id FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM obj_c) OR persona_id IN (SELECT persona_id FROM obj_p);
      SELECT 'borradas', (SELECT count(*) FROM obj), (SELECT count(*) FROM obj_c), (SELECT count(*) FROM obj_p), (SELECT count(*) FROM obj_i),
             (SELECT count(*) FROM asistencias WHERE inscripcion_id IN (SELECT inscripcion_id FROM obj_i));
      DELETE FROM asistencias WHERE inscripcion_id IN (SELECT inscripcion_id FROM obj_i);
      DELETE FROM inscripciones WHERE inscripcion_id IN (SELECT inscripcion_id FROM obj_i);
      DELETE FROM comisiones WHERE comision_id IN (SELECT comision_id FROM obj_c);
      DELETE FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM obj) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM actividades WHERE actividad_id IN (SELECT actividad_id FROM obj);
      DELETE FROM membresias WHERE persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM personas WHERE persona_id IN (SELECT persona_id FROM obj_p);
      COMMIT;
      SELECT 'restantes', (SELECT count(*) FROM actividades WHERE nombre LIKE '${PREFIJO} %'), (SELECT count(*) FROM personas WHERE apellido = 'TEST-FRONT' AND dni IN (${dnis}));`)
    const [, actividades, comisiones, personas, inscripciones, asistencias] = filasSql.find((f) => f[0] === 'borradas')
    const [, restA, restP] = filasSql.find((f) => f[0] === 'restantes')
    console.log(`\n[limpieza] borradas ${actividades} actividades, ${comisiones} comisiones, ${inscripciones} inscripciones, ${asistencias} asistencias y ${personas} personas; quedan ${restA} y ${restP}`)
    if (restA !== '0' || restP !== '0') b.fallar('la limpieza dejó datos de prueba')
  } catch (e) {
    b.fallar(`limpieza: ${e.message}`)
  }
  await b.terminar()
}
