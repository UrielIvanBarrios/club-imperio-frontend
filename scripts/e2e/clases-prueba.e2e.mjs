// E2E: Clases de prueba contra el back real: listado (pendientes / asistieron / todas, búsqueda), alta con
// sus validaciones, los tres rechazos del back en su campo, marcar asistencia (sin perder las notas),
// agregar observaciones (con el tope de 500 caracteres), back caído y llegada desde el detalle de la persona.
// Todo lo que crea lleva el prefijo "TEST-FRONT <corrida>" (actividades) o apellido TEST-FRONT
// con DNI 99xxxxxx (personas), y se borra al final por SQL.
// Una de las personas es socia (paso 4b): antes, con una persona con membresía, el back no podía armar el JSON
// (Persona ↔ Membresia se referenciaban entre sí) y el listado entero fallaba. Queda para que no vuelva.
import { sql } from './lib/config.mjs'
import { crearNavegador, pausa } from './lib/harness.mjs'

const b = await crearNavegador('/clases-prueba')
const { ok, paso, texto, esperar, input, escribir, helper, boton, submit, irA, h1, filas, client, red, abrirSelect, cerrarMenu, dialogo } = b

const CORRIDA = Date.now().toString(36).toUpperCase()
const PREFIJO = `TEST-FRONT ${CORRIDA}`
const base = 99000000 + Math.floor(Math.random() * 900000)
const DNIS = [0, 1, 2, 3].map((i) => String(base + i))

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
const [AYER, MANIANA, EN_UNA_SEMANA] = [dia(-1), dia(1), dia(7)]
const fmt = (s) => s.split('-').reverse().join('/')

const filaDe = (txt) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(txt))
const notasDe = (fila) => [...(fila?.querySelectorAll('ul[aria-label="Observaciones"] li') ?? [])].map((li) => li.textContent)
const opcion = (prefijo) => [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.startsWith(prefijo))
const elegirOpcion = async (name, prefijo) => {
  abrirSelect(name)
  await esperar(() => opcion(prefijo))
  opcion(prefijo).click()
  await esperar(() => !document.querySelector('[role="listbox"]'))
}
const buscarPersona = async (txt) => {
  input('personaId').focus()
  escribir(input('personaId'), txt)
  await pausa(50)
}
const elegirPersona = async (txt, opcionTxt) => {
  await buscarPersona(txt)
  await esperar(() => opcion(opcionTxt))
  opcion(opcionTxt).click()
  await esperar(() => !document.querySelector('[role="listbox"]'))
}
const accion = (aria) => document.querySelector(`button[aria-label="${aria}"]`)
const radio = (valor) => dialogo()?.querySelector(`input[name="asistio"][value="${valor}"]`)
const nota = () => dialogo()?.querySelector('textarea[name="nota"]')
const helperNota = () => nota()?.closest('.MuiFormControl-root')?.querySelector('.MuiFormHelperText-root')?.textContent ?? ''
const api = (path, method = 'POST', body) => client.api(path, { method, body })
const clases = async () => (await api('/api/clases-prueba', 'GET')).filter((c) => c.actividad.nombre.startsWith(PREFIJO))
const claseDe = async (nombre, actividad) => (await clases()).find((c) => c.persona.nombre === nombre && c.actividad.nombre === actividad)
const registrar = (dni, actividadId, fecha) =>
  api(`/api/clases-prueba/registrar?${new URLSearchParams({ dni, actividadId, fecha })}`)
const urlLista = (estado) => `/clases-prueba?q=${encodeURIComponent(CORRIDA)}${estado ? `&estado=${estado}` : ''}`

try {
  await b.sesionAdmin()
  // ---------- datos de partida (por API) ----------
  const actividad = (nombre) => api('/api/actividades', 'POST', { nombre: `${PREFIJO} ${nombre}`, precioMensual: 9000 })
  const tenis = await actividad('Tenis')
  const yoga = await actividad('Yoga')
  const cerrada = await actividad('Cerrada')
  const seCierra = await actividad('Se cierra')
  await api(`/api/actividades/${cerrada.actividadId}`, 'DELETE')
  const [p1, p2, baja] = await Promise.all(
    ['Prospecto1', 'Prospecto2', 'Baja', 'Socia'].map((nombre, i) =>
      api('/api/personas', 'POST', { dni: DNIS[i], nombre, apellido: 'TEST-FRONT', seAsocia: nombre === 'Socia' })),
  )
  await api(`/api/personas/${baja.personaId}`, 'DELETE')
  // Prospecto2: una pendiente de ayer en Yoga (nadie la marcó) y una de Tenis a la que ya vino
  await registrar(DNIS[1], yoga.actividadId, `${AYER}T10:00:00`)
  const tenisP2 = await registrar(DNIS[1], tenis.actividadId, `${AYER}T09:00:00`)
  await api(`/api/clases-prueba/${tenisP2.clasePruebaId}/asistencia?asistio=true&observaciones=${encodeURIComponent('Vino con la madre')}`, 'PATCH')

  paso('[1] Back caído al entrar → mensaje + Reintentar')
  red.caida()
  history.replaceState({}, '', urlLista())
  await b.montarApp()
  ok(await esperar(() => texto().includes('No se pudieron cargar las clases de prueba') && !!boton('Reintentar'), 15000), 'mensaje de error con Reintentar')
  red.normal()
  boton('Reintentar').click()
  ok(await esperar(() => filas() === 1), 'Reintentar → el listado')

  paso('[2] Listado: pendientes, asistieron, todas')
  ok(h1() === 'Clases de prueba' && input('q').value === CORRIDA, 'la búsqueda queda en la URL')
  ok(filaDe('Prospecto2')?.textContent.includes(`${PREFIJO} Yoga`) && filaDe('Prospecto2').textContent.includes('Pendiente · ya pasó la fecha'),
    'por defecto, las pendientes: la de ayer avisa que ya pasó la fecha')
  await elegirOpcion('estado', 'Asistieron')
  ok(await esperar(() => filas() === 1 && filaDe('Asistió')), 'Asistieron → la de Tenis')
  ok(JSON.stringify(notasDe(filaDe('Prospecto2'))) === JSON.stringify(['Vino con la madre']), 'con sus observaciones')
  await elegirOpcion('estado', 'Todas')
  ok(await esperar(() => filas() === 2), 'Todas → las dos')
  ok(new URLSearchParams(location.search).get('estado') === 'todas', 'el filtro queda en la URL')
  escribir(input('q'), 'nadie-se-llama-asi')
  ok(await esperar(() => texto().includes('No hay clases de prueba que coincidan') && !!boton('Limpiar filtros')), 'sin coincidencias → estado vacío con "Limpiar filtros"')

  paso('[3] Alta: obligatorios y validaciones')
  boton('Nueva clase de prueba').click()
  ok(await esperar(() => h1() === 'Nueva clase de prueba' && input('personaId')), 'abre el formulario')
  submit()
  ok(await esperar(() => helper('personaId') === 'Elegí la persona' && helper('actividadId') === 'Elegí la actividad'
    && helper('fecha') === 'Elegí el día de la clase' && helper('hora') === 'Elegí la hora'), 'los cuatro campos obligatorios')
  escribir(input('fecha'), AYER)
  ok(await esperar(() => helper('fecha') === 'La clase no puede ser en un día que ya pasó'), 'un día que ya pasó → error')
  await buscarPersona(DNIS[2])
  ok(await esperar(() => opcion('TEST-FRONT, Baja')?.getAttribute('aria-disabled') === 'true'
    && opcion('TEST-FRONT, Baja').textContent.includes('Dada de baja: no se le puede dar una clase de prueba')), 'la persona dada de baja aparece deshabilitada, con el motivo')
  await elegirPersona(DNIS[1], 'TEST-FRONT, Prospecto2')
  abrirSelect('actividadId')
  ok(await esperar(() => opcion(`${PREFIJO} Yoga`)), 'ofrece las actividades activas')
  ok(!opcion(`${PREFIJO} Cerrada`), 'no ofrece las dadas de baja')
  ok(opcion(`${PREFIJO} Yoga`).textContent.endsWith('Ya tiene una pendiente') && opcion(`${PREFIJO} Yoga`).getAttribute('aria-disabled') === 'true',
    'donde ya tiene una pendiente, deshabilitada')
  ok(opcion(`${PREFIJO} Tenis`).getAttribute('aria-disabled') !== 'true', 'donde ya asistió, se puede pedir otra')
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))

  paso('[4] Alta correcta')
  await elegirPersona(DNIS[0], 'TEST-FRONT, Prospecto1')
  await elegirOpcion('actividadId', `${PREFIJO} Tenis`)
  escribir(input('fecha'), MANIANA)
  escribir(input('hora'), '18:30')
  red.lenta()
  submit()
  ok(await esperar(() => boton('Registrando...')?.disabled), '"Registrando..." mientras espera al back')
  ok(await esperar(() => texto().includes(`Se registró la clase de prueba de Prospecto1 TEST-FRONT en ${PREFIJO} Tenis para el ${fmt(MANIANA)} 18:30`)), 'toast con persona, actividad, día y hora')
  red.normal()
  ok(await esperar(() => location.pathname === '/clases-prueba'), 'vuelve al listado')
  const nueva = await claseDe('Prospecto1', `${PREFIJO} Tenis`)
  ok(nueva?.fechaSolicitada === `${MANIANA}T18:30:00` && nueva.asistio === false, `el back la guardó pendiente para el día y la hora elegidos (${nueva?.fechaSolicitada})`)

  paso('[4b] Una persona socia')
  // Antes, con una persona con membresía el back no podía armar el JSON (Persona ↔ Membresia) y el listado entero fallaba
  await irA('/clases-prueba/nueva')
  await esperar(() => input('personaId'))
  await elegirPersona(DNIS[3], 'TEST-FRONT, Socia')
  await elegirOpcion('actividadId', `${PREFIJO} Yoga`)
  escribir(input('fecha'), MANIANA)
  escribir(input('hora'), '09:00')
  submit()
  ok(await esperar(() => texto().includes(`Se registró la clase de prueba de Socia TEST-FRONT en ${PREFIJO} Yoga para el ${fmt(MANIANA)} 09:00`)), 'el alta de una socia funciona')
  await irA(urlLista())
  ok(await esperar(() => filaDe('TEST-FRONT, Socia')?.textContent.includes(`DNI ${DNIS[3]} · Socio`)), 'el listado carga con ella, y la marca como socia')
  ok(!filaDe('Prospecto1')?.textContent.includes('· Socio'), 'a quien no es socio no')
  accion('Marcar asistencia de TEST-FRONT, Socia').click()
  await esperar(() => dialogo() && boton('Guardar', dialogo()))
  boton('Guardar', dialogo()).click()
  ok(await esperar(() => texto().includes('Se marcó que Socia TEST-FRONT asistió') && !filaDe('TEST-FRONT, Socia')), 'marcarle la asistencia también')
  ok((await claseDe('Socia', `${PREFIJO} Yoga`))?.persona.esSocioActivo === true, 'el back devuelve la persona con esSocioActivo')

  paso('[5] Los rechazos del back, cada uno en su campo')
  await irA('/clases-prueba/nueva')
  await esperar(() => input('personaId'))
  await elegirPersona(DNIS[0], 'TEST-FRONT, Prospecto1')
  await elegirOpcion('actividadId', `${PREFIJO} Yoga`)
  escribir(input('fecha'), EN_UNA_SEMANA)
  escribir(input('hora'), '10:00')
  await registrar(DNIS[0], yoga.actividadId, `${EN_UNA_SEMANA}T11:00:00`) // "desde otra compu", con el formulario abierto
  submit()
  ok(await esperar(() => helper('actividadId') === 'La persona ya tiene una clase de prueba pendiente para esta actividad.'), 'pendiente duplicada → en la actividad')
  abrirSelect('actividadId')
  ok(await esperar(() => opcion(`${PREFIJO} Yoga`)?.textContent.endsWith('Ya tiene una pendiente')), 'y la lista se actualiza: Yoga ahora figura con una pendiente')
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))
  await elegirOpcion('actividadId', `${PREFIJO} Se cierra`)
  await api(`/api/actividades/${seCierra.actividadId}`, 'DELETE')
  submit()
  ok(await esperar(() => helper('actividadId') === 'No se puede registrar una clase de prueba en una actividad inactiva.'), 'actividad dada de baja con el formulario abierto → en la actividad')
  await elegirPersona(DNIS[1], 'TEST-FRONT, Prospecto2')
  await elegirOpcion('actividadId', `${PREFIJO} Tenis`)
  await api(`/api/personas/${p2.personaId}`, 'DELETE')
  submit()
  ok(await esperar(() => helper('personaId') === 'No se puede registrar una clase de prueba: La persona está inactiva.'), 'persona dada de baja con el formulario abierto → en la persona')
  await api(`/api/personas/${p2.personaId}`, 'PUT', { activo: true })
  boton('Cancelar').click()
  ok(await esperar(() => location.pathname === '/clases-prueba'), 'Cancelar vuelve al listado')

  paso('[6] Marcar asistencia con una nota')
  await irA(urlLista())
  ok(await esperar(() => filas() === 3 && !!accion('Marcar asistencia de TEST-FRONT, Prospecto1')), 'pendientes: las 3 de esta corrida')
  ok([...document.querySelectorAll('tbody tr')].map((tr) => tr.cells[0].textContent).join() ===
    [`${fmt(AYER)} 10:00`, `${fmt(MANIANA)} 18:30`, `${fmt(EN_UNA_SEMANA)} 11:00`].join(), 'la próxima primero')
  filaDe(`${fmt(MANIANA)} 18:30`).querySelector('button[aria-label="Marcar asistencia de TEST-FRONT, Prospecto1"]').click()
  ok(await esperar(() => dialogo()?.textContent.includes(`Clase de prueba de ${PREFIJO} Tenis de Prospecto1 TEST-FRONT (DNI ${DNIS[0]}), el ${fmt(MANIANA)} 18:30.`)), 'el diálogo dice de qué clase se trata')
  ok(radio('si')?.checked && dialogo().textContent.includes('Todavía no tiene observaciones.'), 'arranca en "Asistió" y sin observaciones')
  escribir(nota(), '  Le gustó, quiere inscribirse  ')
  boton('Guardar', dialogo()).click()
  ok(await esperar(() => texto().includes(`Se marcó que Prospecto1 TEST-FRONT asistió a la clase de prueba de ${PREFIJO} Tenis`) && !dialogo()), 'toast y se cierra')
  ok(await esperar(() => filas() === 2), 'deja de estar entre las pendientes')
  const marcada = await claseDe('Prospecto1', `${PREFIJO} Tenis`)
  ok(marcada.asistio === true && marcada.observaciones === 'Le gustó, quiere inscribirse', `el back la guardó con la nota sin espacios de más ("${marcada.observaciones}")`)

  paso('[7] Volver a pendiente no borra las notas')
  await irA(urlLista('asistieron'))
  await esperar(() => filaDe('Prospecto2'))
  accion('Marcar asistencia de TEST-FRONT, Prospecto2').click()
  await esperar(() => dialogo())
  ok(boton('Guardar', dialogo()).disabled, 'sin cambios, Guardar deshabilitado')
  ok(notasDe(dialogo()).join() === 'Vino con la madre', 'muestra las notas que ya tiene')
  radio('no').click()
  ok(await esperar(() => dialogo().textContent.includes(`Mientras siga pendiente, no se le puede registrar otra clase de prueba de ${PREFIJO} Tenis.`)), 'avisa qué implica dejarla pendiente')
  red.caida()
  boton('Guardar', dialogo()).click()
  ok(await esperar(() => dialogo()?.textContent.includes('No se pudo conectar con el servidor')), 'back caído → error en el diálogo, que sigue abierto')
  red.normal()
  boton('Guardar', dialogo()).click()
  ok(await esperar(() => texto().includes('La clase de prueba de Prospecto2 TEST-FRONT quedó pendiente') && !dialogo()), 'reintentar guarda')
  const vuelta = await claseDe('Prospecto2', `${PREFIJO} Tenis`)
  ok(vuelta.asistio === false && vuelta.observaciones === 'Vino con la madre', `pendiente, y la nota sigue ("${vuelta.observaciones}")`)

  paso('[8] Agregar observación')
  await irA(urlLista())
  await esperar(() => filaDe(`${PREFIJO} Tenis`) && filas() === 3)
  filaDe(`${fmt(AYER)} 09:00`).querySelector('button[aria-label="Agregar observación a TEST-FRONT, Prospecto2"]').click()
  await esperar(() => nota())
  boton('Agregar', dialogo()).click()
  ok(await esperar(() => helperNota() === 'Escribí la observación'), 'vacía → "Escribí la observación" (el back la aceptaría)')
  escribir(nota(), 'Llamar el lunes')
  ok(await esperar(() => helperNota() === `Quedan ${500 - 'Vino con la madre'.length - ' | Nota: '.length - 'Llamar el lunes'.length} caracteres`), `cuenta lo que queda de los 500 ("${helperNota()}")`)
  boton('Agregar', dialogo()).click()
  ok(await esperar(() => texto().includes('Se agregó la observación a la clase de prueba de Prospecto2 TEST-FRONT') && !dialogo()), 'toast y se cierra')
  ok(await esperar(() => notasDe(filaDe(`${fmt(AYER)} 09:00`)).join('|') === 'Vino con la madre|Llamar el lunes'), 'la fila muestra una nota por línea')
  ok((await claseDe('Prospecto2', `${PREFIJO} Tenis`)).observaciones === 'Vino con la madre | Nota: Llamar el lunes', 'el back la sumó a la anterior')

  paso('[9] Tope de 500 caracteres')
  const larga = await claseDe('Prospecto1', `${PREFIJO} Yoga`)
  await api(`/api/clases-prueba/${larga.clasePruebaId}/asistencia?asistio=false&observaciones=${'x'.repeat(488)}`, 'PATCH') // quedan 3
  await irA('/personas')
  await irA(urlLista())
  // Primero se ve la lista de la caché y enseguida la nueva: se espera a que lleguen las 488 x
  await esperar(() => notasDe(filaDe(fmt(EN_UNA_SEMANA)))[0]?.length === 488)
  accion('Agregar observación a TEST-FRONT, Prospecto1').click()
  await esperar(() => nota())
  ok(helperNota() === 'Quedan 3 caracteres', `con 488 cargados quedan 3 ("${helperNota()}")`)
  escribir(nota(), 'abcd')
  boton('Agregar', dialogo()).click()
  ok(await esperar(() => helperNota() === 'Te pasaste por 1 caracteres'), 'una de más → no se manda: se avisa sin ir al back')
  // Con el diálogo abierto, alguien suma texto desde otra compu: la nota que entraba ya no entra y el back la rechaza
  escribir(nota(), 'ab')
  await esperar(() => helperNota() === 'Quedan 1 caracteres')
  await api(`/api/clases-prueba/${larga.clasePruebaId}/asistencia?asistio=false&observaciones=${'x'.repeat(495)}`, 'PATCH')
  boton('Agregar', dialogo()).click()
  ok(await esperar(() => dialogo()?.textContent.includes('No se puede agregar la nota: las observaciones quedarían con 506 caracteres y el máximo es 500.')),
    'el rechazo del back se muestra en el diálogo, que sigue abierto')
  boton('Cancelar', dialogo()).click()
  await esperar(() => !dialogo())
  await irA('/personas')
  await irA(urlLista())
  await esperar(() => notasDe(filaDe(fmt(EN_UNA_SEMANA)))[0]?.length === 495)
  accion('Agregar observación a TEST-FRONT, Prospecto1').click()
  ok(await esperar(() => dialogo()?.textContent.includes('Ya no entran más observaciones') && boton('Agregar', dialogo()).disabled), 'sin lugar: aviso y Agregar deshabilitado')
  boton('Cancelar', dialogo()).click()

  paso('[10] Desde el detalle de la persona')
  await irA(`/personas/${p1.personaId}`)
  ok(await esperar(() => boton('Clase de prueba')?.getAttribute('href') === `/clases-prueba/nueva?persona=${p1.personaId}`), 'botón "Clase de prueba" con la persona')
  boton('Clase de prueba').click()
  ok(await esperar(() => input('personaId')?.value === `TEST-FRONT, Prospecto1 · DNI ${DNIS[0]}`), 'el formulario llega con la persona elegida')
  ok(document.querySelector('.MuiBreadcrumbs-root')?.textContent === 'Personas/TEST-FRONT, Prospecto1/Clase de prueba', 'migas: Personas / la persona / Clase de prueba')
  boton('Cancelar').click()
  ok(await esperar(() => location.pathname === `/personas/${p1.personaId}`), 'Cancelar vuelve a la persona')
  await irA(`/personas/${baja.personaId}`)
  ok(await esperar(() => h1() === 'Baja TEST-FRONT') && !boton('Clase de prueba'), 'a una persona dada de baja no se le ofrece')

  paso('[11] Menú y consola')
  await irA('/clases-prueba')
  ok(await esperar(() => document.querySelector('a.Mui-selected')?.textContent === 'Clases de prueba'), '"Clases de prueba" resaltado en el menú')
  b.sinErroresDeReact()
} catch (e) {
  b.fallar(e.stack ?? e)
} finally {
  red.normal()
  // Limpieza: solo lo de esta corrida
  try {
    const dnis = DNIS.map((d) => `'${d}'`).join(',')
    const filasSql = sql(`
      BEGIN;
      CREATE TEMP TABLE obj ON COMMIT DROP AS SELECT actividad_id FROM actividades WHERE nombre LIKE '${PREFIJO} %';
      CREATE TEMP TABLE obj_p ON COMMIT DROP AS SELECT persona_id FROM personas WHERE apellido = 'TEST-FRONT' AND dni IN (${dnis});
      SELECT 'borradas', (SELECT count(*) FROM obj), (SELECT count(*) FROM obj_p),
             (SELECT count(*) FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM obj) OR persona_id IN (SELECT persona_id FROM obj_p));
      DELETE FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM obj) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM comisiones WHERE actividad_id IN (SELECT actividad_id FROM obj);
      DELETE FROM actividades WHERE actividad_id IN (SELECT actividad_id FROM obj);
      DELETE FROM membresias WHERE persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM personas WHERE persona_id IN (SELECT persona_id FROM obj_p);
      COMMIT;
      SELECT 'restantes', (SELECT count(*) FROM actividades WHERE nombre LIKE '${PREFIJO} %'), (SELECT count(*) FROM personas WHERE apellido = 'TEST-FRONT' AND dni IN (${dnis}));`)
    const [, actividades, personas, clasesBorradas] = filasSql.find((f) => f[0] === 'borradas')
    const [, restA, restP] = filasSql.find((f) => f[0] === 'restantes')
    console.log(`\n[limpieza] borradas ${actividades} actividades, ${clasesBorradas} clases de prueba y ${personas} personas; quedan ${restA} y ${restP}`)
    if (restA !== '0' || restP !== '0') b.fallar('la limpieza dejó datos de prueba')
  } catch (e) {
    b.fallar(`limpieza: ${e.message}`)
  }
  await b.terminar()
}
