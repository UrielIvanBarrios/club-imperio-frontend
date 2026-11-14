// E2E: ABM de Comisiones contra el back real: alta eligiendo la actividad, filtro por actividad,
// cupo ocupado/total, cupo por debajo de los inscriptos (error en el campo) y baja en cascada.
// Todo lo que crea lleva el prefijo "TEST-FRONT <corrida>" (actividades) o apellido TEST-FRONT
// con DNI 99xxxxxx (socios), y se borra al final por SQL.
import { sql } from './lib/config.mjs'
import { crearNavegador } from './lib/harness.mjs'

const b = await crearNavegador('/comisiones')
const { w, ok, paso, texto, esperar, input, campo, setInput, escribir, helper, boton, submit, irA, h1, filas, dialogo, client, red } = b

const CORRIDA = Date.now().toString(36).toUpperCase()
const PREFIJO = `TEST-FRONT ${CORRIDA}`
const base = 99000000 + Math.floor(Math.random() * 900000)
const DNIS = [0, 1, 2].map((i) => String(base + i))

const etiquetas = () => document.querySelectorAll('.MuiTypography-caption')
const dato = (label) => [...etiquetas()].find((c) => c.textContent === label)?.nextSibling?.textContent
const filaDe = (txt) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(txt))
// MUI Select se abre con mousedown (igual que en el navegador) y muestra las opciones en un menú aparte
const abrirSelect = (nombre) => {
  const combo = input(nombre).closest('.MuiInputBase-root').querySelector('[role="combobox"]')
  combo.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }))
}
const opciones = () => [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent)
const cerrarMenu = () => document.querySelector('[role="listbox"]')?.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

try {
  await b.sesionAdmin()
  // ---------- datos de partida (por API) ----------
  const natacion = await client.api('/api/actividades', { method: 'POST', body: { nombre: `${PREFIJO} Natación`, precioMensual: 15000 } })
  const ajedrez = await client.api('/api/actividades', { method: 'POST', body: { nombre: `${PREFIJO} Ajedrez`, precioMensual: 8000 } })
  const baja = await client.api('/api/actividades', { method: 'POST', body: { nombre: `${PREFIJO} Dada de baja`, precioMensual: 1 } })
  await client.api(`/api/actividades/${baja.actividadId}`, { method: 'DELETE' })
  const cAjedrez = await client.api(`/api/comisiones?actividadId=${ajedrez.actividadId}&nombre=Principiantes&horario=Martes%2019:00&cupo=10`, { method: 'POST' })
  for (const [i, dni] of DNIS.entries()) {
    await client.api('/api/personas', { method: 'POST', body: { dni, nombre: `Alumno${i + 1}`, apellido: 'TEST-FRONT' } })
  }

  paso('[1] Listado: skeleton → datos')
  await b.montarApp()
  ok(await esperar(() => document.querySelector('[aria-busy="true"]')), 'muestra el skeleton mientras carga')
  ok(await esperar(() => !document.querySelector('[aria-busy="true"]') && (filas() > 0 || texto().includes('Todavía no hay comisiones'))), 'muestra la tabla (o el estado vacío)')
  ok(await esperar(() => !!filaDe('Principiantes')), '"Todas las actividades" junta las comisiones de cada actividad')

  paso('[2] Filtro por actividad sin comisiones → alta con la actividad elegida')
  await irA(`/comisiones?actividad=${natacion.actividadId}`)
  ok(await esperar(() => texto().includes('No hay comisiones que coincidan') && !!boton('Agregar comisión')), 'actividad sin comisiones → estado vacío con "Agregar comisión"')
  boton('Agregar comisión').click()
  ok(await esperar(() => location.pathname === '/comisiones/nueva' && input('actividadId')?.value === natacion.actividadId), 'el alta abre con la actividad del filtro ya elegida')

  paso('[3] Alta: actividades ofrecidas y validaciones')
  abrirSelect('actividadId')
  ok(await esperar(() => opciones().includes(natacion.nombre)), 'el select ofrece las actividades activas')
  ok(!opciones().includes(baja.nombre), 'no ofrece las actividades dadas de baja')
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))
  submit()
  ok(await esperar(() => helper('nombre') === 'El nombre es obligatorio' && helper('horario') === 'El horario es obligatorio'), 'nombre y horario obligatorios')
  setInput('nombre', '   ')
  setInput('cupo', 'abc')
  submit()
  // Se espera el error del cupo: el del nombre ya estaba en pantalla desde el envío anterior
  ok(await esperar(() => helper('cupo') === 'Ingresá un número entero'), `cupo "abc" → "${helper('cupo')}"`)
  ok(helper('nombre') === 'El nombre es obligatorio', 'solo espacios no cuenta como nombre (el back lo aceptaría)')
  setInput('cupo', '0')
  submit()
  ok(await esperar(() => helper('cupo') === 'El cupo tiene que ser mayor a 0'), `cupo 0 → "${helper('cupo')}"`)
  await irA('/comisiones/nueva')
  await esperar(() => input('actividadId') && input('actividadId').value === '')
  submit()
  ok(await esperar(() => helper('actividadId') === 'Elegí la actividad'), 'sin actividad → "Elegí la actividad"')

  paso('[4] Alta válida (eligiendo la actividad en el select)')
  abrirSelect('actividadId')
  await esperar(() => opciones().includes(natacion.nombre))
  ;[...document.querySelectorAll('[role="option"]')].find((o) => o.textContent === natacion.nombre).click()
  ok(await esperar(() => input('actividadId').value === natacion.actividadId), 'elegir la opción carga la actividad')
  setInput('nombre', '  Turno Mañana  ')
  setInput('horario', 'Sábados 10:00')
  setInput('cupo', '3')
  red.lenta()
  submit()
  const btn = () => document.querySelector('form button[type="submit"]')
  ok(await esperar(() => btn()?.textContent === 'Guardando...' && btn().disabled), 'botón "Guardando..." y deshabilitado')
  ok(await esperar(() => location.pathname.startsWith('/comisiones/') && h1() === 'Turno Mañana'), `redirige al detalle, nombre sin espacios (${h1()})`)
  red.normal()
  const idManiana = location.pathname.split('/')[2]
  ok(texto().includes('Comisión creada: Turno Mañana'), 'toast "Comisión creada"')
  ok(document.querySelector('.MuiBreadcrumbs-root')?.textContent === `Comisiones/${natacion.nombre} · Turno Mañana`, 'breadcrumbs: Comisiones / Actividad · Comisión')
  ok(dato('Actividad') === natacion.nombre && dato('Horario') === 'Sábados 10:00', 'datos: actividad y horario')
  ok(await esperar(() => dato('Cupo')?.startsWith('0 / 3 ocupados · 3 lugares libres')), `cupo: "${dato('Cupo')}"`)
  ok(texto().includes('Todavía no hay inscriptos'), 'inscriptos: estado vacío')

  paso('[5] Alta duplicada (misma actividad, nombre y horario, otras mayúsculas)')
  await irA(`/comisiones/nueva?actividad=${natacion.actividadId}`)
  await esperar(() => input('actividadId')?.value === natacion.actividadId)
  setInput('nombre', 'turno mañana')
  setInput('horario', 'SÁBADOS 10:00')
  submit()
  ok(await esperar(() => helper('nombre').startsWith('Ya existe una comisión para')), `"${helper('nombre')}"`)
  ok(location.pathname === '/comisiones/nueva', 'se queda en el formulario')

  paso('[6] Inscriptos y cupo ocupado')
  for (const dni of DNIS) await client.api(`/api/inscripciones?dni=${dni}&comisionId=${idManiana}`, { method: 'POST' })
  await irA(`/comisiones/${idManiana}`)
  ok(await esperar(() => filas() === 3 && dato('Cupo')?.startsWith('3 / 3 ocupados · Completa')), `cupo lleno: "${dato('Cupo')}"`)
  ok(document.querySelector('[role="progressbar"]')?.getAttribute('aria-label') === 'Cupo ocupado: 3 de 3', 'barra de cupo con su etiqueta accesible')
  ok(document.querySelector('tbody tr td:nth-child(2)')?.textContent === 'TEST-FRONT, Alumno1', 'inscriptos ordenados por apellido y nombre')
  document.querySelector('tbody tr').click()
  ok(await esperar(() => location.pathname.startsWith('/personas/') && h1() === 'Alumno1 TEST-FRONT'), 'click en un inscripto → detalle de la persona')
  ok(await esperar(() => texto().includes('Turno Mañana') && texto().includes('Sábados 10:00')), 'la persona muestra la inscripción')

  paso('[7] Edición: el cupo no puede quedar por debajo de los inscriptos')
  await irA(`/comisiones/${idManiana}/editar`)
  ok(await esperar(() => input('nombre')?.value === 'Turno Mañana' && helper('cupo') === 'Inscriptos activos: 3 · no se puede quitar el tope'), `ayuda del cupo: "${helper('cupo')}"`)
  ok(!!input('actividadId').closest('.Mui-disabled') && helper('actividadId') === 'Una comisión no se puede cambiar de actividad', 'la actividad no se puede cambiar')
  setInput('cupo', '2')
  submit()
  ok(await esperar(() => helper('cupo') === 'El cupo no puede ser menor a los 3 inscriptos activos de la comisión.'), `cupo 2 → error del back en el campo: "${helper('cupo')}"`)
  ok(location.pathname.endsWith('/editar') && document.activeElement === input('cupo'), 'se queda en el formulario con foco en el cupo')
  setInput('cupo', '')
  submit()
  ok(await esperar(() => helper('cupo') === 'Esta comisión ya tiene cupo: no se le puede quitar el tope'), 'vaciar el cupo → no se puede quitar el tope')
  setInput('cupo', '5')
  setInput('horario', 'Sábados 10:30')
  submit()
  ok(await esperar(() => location.pathname === `/comisiones/${idManiana}` && texto().includes('Cambios guardados')), 'guarda y vuelve al detalle con toast')
  ok(await esperar(() => dato('Cupo')?.startsWith('3 / 5 ocupados · 2 lugares libres') && dato('Horario') === 'Sábados 10:30'), `cupo y horario actualizados: "${dato('Cupo')}"`)

  paso('[8] Comisión sin tope')
  const cTarde = await client.api(`/api/comisiones?actividadId=${natacion.actividadId}&nombre=Turno%20Tarde&horario=S%C3%A1bados%2016:00`, { method: 'POST' })
  await irA(`/comisiones/${cTarde.comisionId}`)
  ok(await esperar(() => dato('Cupo') === '0 inscriptos (sin tope de cupo)'), `detalle: "${dato('Cupo')}"`)
  await irA(`/comisiones/${cTarde.comisionId}/editar`)
  ok(await esperar(() => helper('cupo') === 'Inscriptos activos: 0 · vacío = sin tope'), `edición: "${helper('cupo')}"`)

  paso('[9] Listado: filtro por actividad y búsqueda')
  await irA(`/comisiones?actividad=${natacion.actividadId}`)
  ok(await esperar(() => filas() === 2 && filaDe('Turno Mañana') && filaDe('Turno Tarde') && !filaDe('Principiantes')), 'filtro por Natación → solo sus 2 comisiones')
  ok(!!filaDe('Turno Tarde')?.textContent.includes('Sin tope'), 'la columna Cupo muestra "Sin tope"')
  escribir(campo('Buscar por nombre u horario'), 'tarde')
  ok(await esperar(() => filas() === 1 && filaDe('Turno Tarde')), 'búsqueda "tarde" → 1 resultado')
  ok(location.search.includes('actividad=') && location.search.includes('q=tarde'), `filtro y búsqueda en la URL (${decodeURIComponent(location.search)})`)
  ok(boton('Nueva comisión')?.getAttribute('href') === `/comisiones/nueva?actividad=${natacion.actividadId}`, '"Nueva comisión" lleva la actividad filtrada')

  paso('[10] Baja en cascada desde el detalle')
  await irA(`/comisiones/${idManiana}`)
  await esperar(() => filas() === 3)
  boton('Dar de baja').click()
  ok(await esperar(() => dialogo()?.textContent.includes('También se van a dar de baja sus 3 inscripciones activas.')), 'el modal avisa: "sus 3 inscripciones activas"')
  red.lenta()
  boton('Dar de baja', dialogo()).click()
  ok(await esperar(() => boton('Dando de baja...', dialogo())?.disabled), 'botón "Dando de baja..." deshabilitado')
  ok(await esperar(() => !dialogo() && texto().includes('Se dio de baja la comisión Turno Mañana')), 'toast "Se dio de baja la comisión"')
  red.normal()
  ok(await esperar(() => texto().includes('Esta comisión está dada de baja') && texto().includes('No tiene inscriptos activos')), 'sin recargar: aviso y sin inscriptos')
  ok(!boton('Editar') && !boton('Dar de baja'), 'ya no ofrece editar ni dar de baja')
  ok((await client.api(`/api/inscripciones/socio/${DNIS[0]}`)).length === 0, 'el back dio de baja las inscripciones')
  await irA(`/comisiones/${idManiana}/editar`)
  ok(await esperar(() => texto().includes('No se puede editar') && texto().includes('Esta comisión está dada de baja.')), 'entrar a /editar a mano → "No se puede editar"')

  paso('[11] Baja desde el listado, sin inscriptos')
  await irA(`/comisiones?actividad=${natacion.actividadId}`)
  await esperar(() => filaDe('Turno Tarde'))
  document.querySelector('button[aria-label="Dar de baja Turno Tarde"]').click()
  ok(await esperar(() => dialogo()?.textContent.includes('No tiene inscriptos activos.')), 'el modal dice "No tiene inscriptos activos."')
  boton('Dar de baja', dialogo()).click()
  ok(await esperar(() => !dialogo() && !filaDe('Turno Tarde') && texto().includes('No hay comisiones que coincidan')), 'con "Activas" desaparece del listado')
  await irA(`/comisiones?actividad=${natacion.actividadId}&estado=inactivas`)
  ok(await esperar(() => filas() === 2 && [...document.querySelectorAll('tbody tr')].every((tr) => tr.textContent.includes('Inactiva'))), 'con "Inactivas" aparecen las 2')
  ok(document.querySelector('button[aria-label="Editar Turno Tarde"]')?.disabled, 'en una inactiva, Editar está deshabilitado')

  paso('[12] Desde el detalle de la actividad')
  await irA(`/actividades/${ajedrez.actividadId}`)
  ok(await esperar(() => !!filaDe('Principiantes')), 'la actividad lista su comisión')
  ok(boton('Nueva comisión')?.getAttribute('href') === `/comisiones/nueva?actividad=${ajedrez.actividadId}`, '"Nueva comisión" abre el alta con esa actividad')
  filaDe('Principiantes').click()
  ok(await esperar(() => location.pathname === `/comisiones/${cAjedrez.comisionId}` && h1() === 'Principiantes'), 'click en la comisión → su detalle')
  ok(await esperar(() => dato('Cupo')?.startsWith('0 / 10 ocupados')), 'muestra su cupo')

  paso('[13] Error con reintentar')
  const cExtra = await client.api(`/api/comisiones?actividadId=${ajedrez.actividadId}&nombre=Avanzados&horario=Jueves%2019:00`, { method: 'POST' })
  red.caida()
  await irA(`/comisiones/${cExtra.comisionId}`) // detalle que no está en caché
  ok(await esperar(() => texto().includes('No se pudo conectar con el servidor') && !!boton('Reintentar'), 15000), 'back caído → mensaje entendible + Reintentar')
  red.normal()
  boton('Reintentar').click()
  ok(await esperar(() => h1() === 'Avanzados'), 'Reintentar → carga el detalle')

  paso('[14] Detalle inexistente / link inválido')
  await irA('/comisiones/abc')
  ok(await esperar(() => texto().includes('No existe la comisión') && texto().includes('El link no es válido.')), '/comisiones/abc → "No existe la comisión"')
  await irA('/comisiones/00000000-0000-0000-0000-000000000000')
  ok(await esperar(() => texto().includes('Comision no encontrado')), 'UUID inexistente → mensaje del back')
  ok(!boton('Reintentar') && !!boton('Volver al listado'), 'sin "Reintentar", con "Volver al listado"')

  paso('[15] Menú y consola')
  ok(document.querySelector('a.Mui-selected')?.textContent === 'Comisiones', '"Comisiones" resaltado en el menú')
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
      SELECT 'borradas', (SELECT count(*) FROM obj), (SELECT count(*) FROM obj_c), (SELECT count(*) FROM obj_p);
      DELETE FROM asistencias WHERE inscripcion_id IN (SELECT inscripcion_id FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM obj_c) OR persona_id IN (SELECT persona_id FROM obj_p));
      DELETE FROM inscripciones WHERE comision_id IN (SELECT comision_id FROM obj_c) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM comisiones WHERE comision_id IN (SELECT comision_id FROM obj_c);
      DELETE FROM clases_prueba WHERE actividad_id IN (SELECT actividad_id FROM obj) OR persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM actividades WHERE actividad_id IN (SELECT actividad_id FROM obj);
      DELETE FROM membresias WHERE persona_id IN (SELECT persona_id FROM obj_p);
      DELETE FROM personas WHERE persona_id IN (SELECT persona_id FROM obj_p);
      COMMIT;
      SELECT 'restantes', (SELECT count(*) FROM actividades WHERE nombre LIKE '${PREFIJO} %'), (SELECT count(*) FROM personas WHERE apellido = 'TEST-FRONT' AND dni IN (${dnis}));`)
    const [, actividades, comisiones, personas] = filasSql.find((f) => f[0] === 'borradas')
    const [, restA, restP] = filasSql.find((f) => f[0] === 'restantes')
    console.log(`\n[limpieza] borradas ${actividades} actividades, ${comisiones} comisiones y ${personas} personas; quedan ${restA} y ${restP}`)
    if (restA !== '0' || restP !== '0') b.fallar('la limpieza dejó datos de prueba')
  } catch (e) {
    b.fallar(`limpieza: ${e.message}`)
  }
  await b.terminar()
}
