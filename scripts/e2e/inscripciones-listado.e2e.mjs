// E2E: listado de Inscripciones (/inscripciones) contra el back real: filtros por actividad, por comisión
// (dependiente de la actividad) y por estado (activas / bajas / todas), búsqueda por DNI o nombre sin tildes
// con una sola request al dejar de tipear, todo en la URL (y "atrás" lo conserva), links al socio y a la
// comisión, el 400 del back con un link armado a mano, back caído y el acceso al formulario de alta.
// Todo lo que crea lleva el prefijo "TEST-FRONT <corrida>" (actividades) o apellido TEST-FRONT
// con DNI 99xxxxxx (socios), y se borra al final por SQL.
import { sql } from './lib/config.mjs'
import { crearNavegador, pausa } from './lib/harness.mjs'

const b = await crearNavegador('/inscripciones')
const { ok, paso, texto, esperar, input, escribir, boton, irA, atras, h1, filas, client, red, abrirSelect, opciones, cerrarMenu, elegir } = b

const CORRIDA = Date.now().toString(36).toUpperCase()
const PREFIJO = `TEST-FRONT ${CORRIDA}`
const base = 99000000 + Math.floor(Math.random() * 900000)
const DNIS = [0, 1, 2].map((i) => String(base + i))

const hoy = new Date()
const HOY = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
const filaDe = (txt) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(txt))
const nombres = () => [...document.querySelectorAll('tbody tr')].map((tr) => tr.cells[0].querySelector('a')?.textContent)
const param = (k) => new URLSearchParams(location.search).get(k)
const deshabilitado = (name) => !!input(name)?.closest('.MuiInputBase-root')?.classList.contains('Mui-disabled')
const api = (path, method = 'POST', body) => client.api(path, { method, body })

// Cuenta las requests al listado (GET /api/inscripciones?...), para ver que la búsqueda no sale con cada tecla
const pedidos = []
const contarPedidos = () => {
  const f = globalThis.fetch
  globalThis.fetch = (url, ...r) => {
    if (/\/api\/inscripciones\?/.test(String(url)) && (r[0]?.method ?? 'GET') === 'GET') pedidos.push(decodeURIComponent(String(url)))
    return f(url, ...r)
  }
}

try {
  await b.sesionAdmin()
  // ---------- datos de partida (por API) ----------
  const actividad = (nombre) => api('/api/actividades', 'POST', { nombre: `${PREFIJO} ${nombre}`, precioMensual: 9000 })
  const natacion = await actividad('Natación')
  const tenis = await actividad('Tenis')
  const comision = (act, nombre, horario) => api(`/api/comisiones?${new URLSearchParams({ actividadId: act.actividadId, nombre, horario })}`)
  const maniana = await comision(natacion, 'Mañana', 'Lunes 09:00')
  const tarde = await comision(natacion, 'Tarde', 'Martes 18:00')
  const cerrada = await comision(natacion, 'Cerrada', 'Viernes 20:00')
  const unica = await comision(tenis, 'Única', 'Sábado 10:00')
  // José es socio; Ana y Beto no. Todos con apellido TEST-FRONT: el orden lo decide el nombre.
  const [jose] = await Promise.all(
    ['José', 'Ana', 'Beto'].map((nombre, i) => api('/api/personas', 'POST', { dni: DNIS[i], nombre, apellido: 'TEST-FRONT', seAsocia: i === 0 })),
  )
  const inscribir = (dni, c) => api(`/api/inscripciones?dni=${dni}&comisionId=${c.comisionId}`)
  await inscribir(DNIS[0], maniana)
  await inscribir(DNIS[0], unica)
  const deAna = await inscribir(DNIS[1], tarde)
  await api(`/api/inscripciones/${deAna.inscripcionId}`, 'DELETE') // Ana: baja de la inscripción
  await inscribir(DNIS[2], cerrada)
  await api(`/api/comisiones/${cerrada.comisionId}`, 'DELETE') // Beto: baja en cascada con la comisión

  paso('[1] Back caído al entrar → mensaje + Reintentar')
  red.caida()
  history.replaceState({}, '', `/inscripciones?actividad=${natacion.actividadId}`)
  await b.montarApp()
  ok(await esperar(() => document.querySelector('[aria-busy="true"]')), 'muestra el skeleton mientras carga')
  ok(await esperar(() => texto().includes('No se pudieron cargar las inscripciones') && !!boton('Reintentar'), 15000), 'mensaje de error con Reintentar')
  red.normal()
  boton('Reintentar').click()
  ok(await esperar(() => filas() === 1), 'Reintentar → el listado')

  paso('[2] Filtro por actividad (desde la URL): por defecto, las activas')
  ok(h1() === 'Inscripciones', 'título "Inscripciones"')
  ok(await esperar(() => input('actividad')?.value === natacion.actividadId), 'el select de actividad toma la de la URL')
  const fila = filaDe('José')
  ok(fila && [...fila.cells].map((c) => c.textContent).join('|') === `TEST-FRONT, José|${DNIS[0]}|${natacion.nombre}|Mañana|Lunes 09:00|${HOY}|Activa`,
    `fila con socio, DNI, actividad, comisión, horario, fecha y estado: "${[...(fila?.cells ?? [])].map((c) => c.textContent).join('|')}"`)
  ok(!filaDe('Ana') && !filaDe('Beto'), 'no muestra las dadas de baja')

  paso('[3] Filtro por estado')
  await elegir('estado', 'Dadas de baja')
  ok(await esperar(() => filas() === 2 && !filaDe('José')), 'Dadas de baja → Ana y Beto')
  ok(param('estado') === 'bajas', 'el estado queda en la URL')
  ok(filaDe('Ana')?.textContent.includes(`Dada de bajael ${HOY}`) && filaDe('Ana').textContent.includes('No socio'), 'baja con su fecha, y marca a quien no es socio')
  ok(filaDe('Beto')?.textContent.includes('Cerrada'), 'incluye la que se dio de baja en cascada con la comisión')
  await elegir('estado', 'Todas')
  ok(await esperar(() => filas() === 3), 'Todas → las tres')
  ok(nombres().join() === ['TEST-FRONT, Ana', 'TEST-FRONT, Beto', 'TEST-FRONT, José'].join(), `ordenadas por apellido y nombre: ${nombres().join(' / ')}`)
  ok(!filaDe('José')?.textContent.includes('No socio'), 'al socio no lo marca')

  paso('[4] Filtro por comisión, dependiente de la actividad')
  abrirSelect('comision')
  ok(await esperar(() => opciones().includes('Mañana · Lunes 09:00')), 'ofrece las comisiones de la actividad elegida')
  ok(opciones().includes('Cerrada · Viernes 20:00 (dada de baja)'), 'también las dadas de baja, marcadas')
  ok(!opciones().some((o) => o.startsWith('Única')), 'no las de otra actividad')
  cerrarMenu()
  await esperar(() => !document.querySelector('[role="listbox"]'))
  await elegir('comision', 'Tarde · Martes 18:00')
  ok(await esperar(() => filas() === 1 && !!filaDe('Ana')), 'Tarde → solo Ana')
  ok(param('comision') === tarde.comisionId, 'la comisión queda en la URL')
  await elegir('actividad', tenis.nombre)
  ok(await esperar(() => param('actividad') === tenis.actividadId && param('comision') === null), 'cambiar la actividad borra la comisión elegida')
  ok(await esperar(() => filas() === 1 && filaDe('José')?.textContent.includes('Única')), 'Tenis → José en Única')
  await elegir('actividad', 'Todas las actividades')
  ok(await esperar(() => deshabilitado('comision')), 'sin actividad, el select de comisión queda deshabilitado')

  paso('[5] Búsqueda por DNI o nombre (en el back, al dejar de tipear)')
  await elegir('actividad', natacion.nombre)
  await esperar(() => filas() === 3)
  contarPedidos()
  for (const t of ['j', 'jo', 'jos', 'jose']) {
    escribir(input('q'), t)
    await pausa(40)
  }
  ok(await esperar(() => filas() === 1 && !!filaDe('José')), '"jose" sin tilde encuentra a José')
  ok(param('q') === 'jose', 'la búsqueda queda en la URL')
  const conQ = pedidos.filter((u) => u.includes('q='))
  ok(conQ.length === 1 && conQ[0].includes('q=jose'), `una sola request, con el texto completo (${conQ.length}: ${conQ.join(' , ')})`)
  escribir(input('q'), 'test-front jose')
  ok(await esperar(() => filas() === 1 && !!filaDe('José') && param('q') === 'test-front jose'), 'apellido y nombre')
  escribir(input('q'), 'JOSÉ TEST-FRONT')
  ok(await esperar(() => filas() === 1 && !!filaDe('José') && param('q') === 'JOSÉ TEST-FRONT'), 'nombre y apellido, en mayúsculas')
  const conPuntos = DNIS[1].replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3')
  escribir(input('q'), conPuntos)
  ok(await esperar(() => filas() === 1 && !!filaDe('Ana')), `DNI con puntos (${conPuntos}) → Ana`)
  // Lo que tienen en común los tres DNI (son consecutivos): al menos los primeros 6 dígitos
  let comun = DNIS[0]
  while (!DNIS.every((d) => d.startsWith(comun))) comun = comun.slice(0, -1)
  escribir(input('q'), comun)
  ok(await esperar(() => filas() === 3), `parte del DNI (${comun}) → los tres`)
  escribir(input('q'), 'nadie-se-llama-asi')
  ok(await esperar(() => texto().includes('No hay inscripciones que coincidan') && !!boton('Limpiar filtros')), 'sin coincidencias → estado vacío con "Limpiar filtros"')
  boton('Limpiar filtros').click()
  ok(await esperar(() => location.search === '' && input('q').value === '' && input('actividad').value === '' && input('estado').value === 'activas'), 'Limpiar filtros deja todo por defecto')

  paso('[6] Cada fila lleva al socio o a la comisión, y "atrás" vuelve al listado como estaba')
  await irA(`/inscripciones?actividad=${natacion.actividadId}&estado=todas&q=test-front`)
  ok(await esperar(() => filas() === 3), 'listado armado desde un link')
  const linkSocio = filaDe('José').cells[0].querySelector('a')
  const linkComision = filaDe('José').cells[3].querySelector('a')
  ok(linkSocio?.getAttribute('href') === `/personas/${jose.personaId}`, 'el nombre lleva al socio')
  ok(linkComision?.getAttribute('href') === `/comisiones/${maniana.comisionId}`, 'la comisión lleva a la comisión')
  linkSocio.click()
  ok(await esperar(() => location.pathname === `/personas/${jose.personaId}` && h1() === 'José TEST-FRONT'), 'click → detalle del socio')
  atras()
  ok(await esperar(() => location.pathname === '/inscripciones' && filas() === 3 && input('q')?.value === 'test-front' && input('estado').value === 'todas'), 'atrás → el listado con sus filtros')
  filaDe('Ana').cells[3].querySelector('a').click()
  ok(await esperar(() => location.pathname === `/comisiones/${tarde.comisionId}` && h1() === 'Tarde'), 'click en la comisión → detalle de la comisión')

  paso('[7] Link armado a mano: el 400 del back, con "Limpiar filtros"')
  await irA(`/inscripciones?actividad=${natacion.actividadId}&comision=${unica.comisionId}`)
  ok(await esperar(() => texto().includes('La comisión Única no pertenece a la actividad indicada.')), 'comisión de otra actividad → el mensaje del back')
  boton('Limpiar filtros').click()
  ok(await esperar(() => location.search === '' && !texto().includes('no pertenece')), 'Limpiar filtros → listado sin filtros')
  await irA('/inscripciones?estado=inventado')
  ok(await esperar(() => input('estado')?.value === 'activas' && !texto().includes('El estado debe ser')), 'un estado inventado en la URL se toma como "Activas"')

  paso('[8] Inscribir socio desde el listado, y el listado se actualiza')
  await irA(`/inscripciones?actividad=${tenis.actividadId}`)
  await esperar(() => filas() === 1)
  ok(boton('Inscribir socio')?.getAttribute('href') === '/inscripciones/nueva', 'botón "Inscribir socio" → /inscripciones/nueva')
  boton('Inscribir socio').click()
  ok(await esperar(() => location.pathname === '/inscripciones/nueva' && input('personaId')), 'abre el formulario')
  ok(document.querySelector('.MuiBreadcrumbs-root')?.textContent === 'Inscripciones/Inscribir socio', 'breadcrumbs: Inscripciones / Inscribir socio')
  boton('Cancelar').click()
  ok(await esperar(() => location.pathname === '/inscripciones'), 'Cancelar vuelve al listado')
  await inscribir(DNIS[2], unica) // "desde otra pantalla": el alta invalida la caché del listado
  await irA(`/inscripciones?actividad=${tenis.actividadId}`)
  ok(await esperar(() => filas() === 2 && !!filaDe('Beto')), 'al volver, el listado trae la inscripción nueva')

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
