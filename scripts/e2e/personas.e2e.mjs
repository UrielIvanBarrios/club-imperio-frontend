// E2E: ABM de Personas contra el back real.
// Crea 9 personas TEST-FRONT con DNIs 99xxxxxx y las borra al final (por SQL: el back solo tiene baja lógica).
import { sql } from './lib/config.mjs'
import { crearNavegador } from './lib/harness.mjs'

const b = await crearNavegador('/personas')
const { ok, paso, texto, esperar, input, setInput, escribir, helper, boton, submit, irA, atras, h1, filas, dialogo, client, red } = b

const APELLIDO = 'TEST-FRONT'
const base = 99000000 + Math.floor(Math.random() * 900000)
const DNI = String(base) // la persona que se da de alta por la UI; base+1..base+8 se crean por API
const DNIS = Array.from({ length: 9 }, (_, i) => String(base + i))

const buscarDni = async (valor) => {
  await esperar(() => document.querySelector('input:not([name])[inputmode="numeric"]'))
  escribir(document.querySelector('input:not([name])[inputmode="numeric"]'), valor)
  boton('Buscar').click()
}

try {
  await b.sesionAdmin()

  paso('[1] Listado: skeleton → datos')
  await b.montarApp()
  ok(await esperar(() => document.querySelector('[aria-busy="true"]')), 'muestra el skeleton mientras carga')
  ok(await esperar(() => !document.querySelector('[aria-busy="true"]') && (filas() > 0 || texto().includes('Todavía no hay personas'))), 'muestra la tabla (o el estado vacío)')

  paso('[2] Alta: validaciones de Zod debajo de cada campo')
  boton('Nueva persona').click()
  ok(await esperar(() => location.pathname === '/personas/nueva' && input('dni')), 'botón "Nueva persona" → /personas/nueva')
  submit()
  ok(await esperar(() => helper('dni') === 'El DNI es obligatorio'), `DNI vacío → "${helper('dni')}"`)
  ok(helper('nombre') === 'El nombre es obligatorio' && helper('apellido') === 'El apellido es obligatorio', 'nombre y apellido obligatorios')
  ok(document.activeElement === input('dni'), 'hace foco en el primer campo con error')
  setInput('dni', '12A45')
  setInput('email', 'mal@')
  setInput('fechaNacimiento', '2099-01-01')
  setInput('telefonoPrincipal', '1'.repeat(21))
  submit()
  ok(await esperar(() => helper('dni') === 'Deben ser de 6 a 8 dígitos, sin letras'), `DNI con letras → "${helper('dni')}"`)
  ok(helper('email') === 'El email no es válido', `email → "${helper('email')}"`)
  ok(helper('fechaNacimiento') === 'La fecha no puede ser futura', `fecha futura → "${helper('fechaNacimiento')}"`)
  ok(helper('telefonoPrincipal') === 'Máximo 20 caracteres', `teléfono largo → "${helper('telefonoPrincipal')}"`)

  paso('[3] Alta válida, con membresía y botón deshabilitado mientras guarda')
  const dniConPuntos = `${DNI.slice(0, 2)}.${DNI.slice(2, 5)}.${DNI.slice(5)}`
  setInput('dni', dniConPuntos)
  setInput('nombre', 'Ana')
  setInput('apellido', APELLIDO)
  setInput('email', 'ANA.TEST@Example.com')
  setInput('fechaNacimiento', '2010-05-03')
  setInput('telefonoPrincipal', '1155550000')
  document.querySelector('input[type="checkbox"]').click()
  ok(await esperar(() => input('fechaAltaManual')), 'al tildar "Se asocia" aparece la fecha de alta')
  setInput('fechaAltaManual', '2026-03-01')
  red.lenta()
  submit()
  const btnSubmit = () => document.querySelector('form button[type="submit"]')
  ok(await esperar(() => btnSubmit()?.textContent === 'Guardando...' && btnSubmit().disabled), 'botón "Guardando..." y deshabilitado')
  ok(await esperar(() => location.pathname.startsWith('/personas/') && h1() === `Ana ${APELLIDO}`), `redirige al detalle (${location.pathname})`)
  red.normal()
  const idCreada = location.pathname.split('/')[2]
  ok(texto().includes(`Persona creada: Ana ${APELLIDO}`), 'toast "Persona creada"')
  ok(texto().includes(DNI) && !texto().includes(dniConPuntos), `DNI guardado normalizado (${DNI})`)
  ok(texto().includes('ana.test@example.com'), 'email guardado en minúsculas')
  ok(texto().includes('03/05/2010'), 'fecha de nacimiento 03/05/2010 (sin corrimiento por zona horaria)')
  ok(texto().includes('Socio') && texto().includes('01/03/2026') && texto().includes('Vigente'), 'membresía vigente desde 01/03/2026')
  ok(await esperar(() => texto().includes('No tiene inscripciones activas')), 'inscripciones: estado vacío')
  const migas = document.querySelector('.MuiBreadcrumbs-root')?.textContent
  ok(migas === `Personas/${APELLIDO}, Ana`, `breadcrumbs: "${migas}"`)

  paso('[4] Alta con DNI duplicado → error del back debajo del DNI')
  await irA('/personas/nueva')
  await esperar(() => input('dni') && input('dni').value === '')
  setInput('dni', DNI)
  setInput('nombre', 'Otra')
  setInput('apellido', APELLIDO)
  submit()
  ok(await esperar(() => helper('dni').startsWith('Ya existe una persona con el dni')), `"${helper('dni')}"`)
  ok(location.pathname === '/personas/nueva', 'se queda en el formulario')
  ok(input('nombre').value === 'Otra', 'no pierde lo que escribió')

  paso('[5] Edición')
  await irA(`/personas/${idCreada}/editar`)
  ok(await esperar(() => input('nombre')?.value === 'Ana'), 'carga los datos de la persona')
  ok(input('dni').readOnly && helper('dni') === 'El DNI no se puede modificar', 'DNI de solo lectura')
  ok(!document.querySelector('input[type="checkbox"]'), 'no muestra la membresía')
  setInput('telefonoPrincipal', '1166661111')
  setInput('nombre', 'Ana María')
  submit()
  ok(await esperar(() => location.pathname === `/personas/${idCreada}` && h1() === `Ana María ${APELLIDO}`), 'vuelve al detalle con el nombre nuevo')
  ok(texto().includes('Cambios guardados') && texto().includes('1166661111'), 'toast "Cambios guardados" y teléfono actualizado')
  await irA(`/personas/${idCreada}/editar`)
  await esperar(() => input('nombre')?.value === 'Ana María')
  setInput('nombre', '')
  submit()
  ok(await esperar(() => helper('nombre') === 'El nombre es obligatorio'), 'en edición también valida (nombre vacío)')
  boton('Cancelar').click()
  // Se espera a que el detalle esté dibujado: React Router navega dentro de una transición,
  // y hasta que termina, el formulario anterior sigue montado.
  ok(await esperar(() => location.pathname === `/personas/${idCreada}` && h1() === `Ana María ${APELLIDO}` && !input('nombre')), 'Cancelar vuelve al detalle')

  paso('[6] Edición: vaciar el email lo borra de verdad')
  await irA(`/personas/${idCreada}/editar`)
  await esperar(() => input('email')?.value === 'ana.test@example.com')
  setInput('email', '')
  submit()
  ok(await esperar(() => location.pathname === `/personas/${idCreada}` && texto().includes('Cambios guardados')), 'guarda con el email vacío')
  const dato = (label) => [...document.querySelectorAll('.MuiTypography-caption')].find((c) => c.textContent === label)?.nextSibling?.textContent
  ok(await esperar(() => dato('Email') === '—'), `el detalle muestra Email "${dato('Email')}"`)
  ok(dato('Teléfono') === '1166661111', 'el teléfono no se tocó')
  const enBack = await client.api(`/api/personas/${idCreada}`)
  ok(enBack.email === null, `el back devuelve email = ${JSON.stringify(enBack.email)}`)
  const [[enBase]] = sql(`SELECT coalesce(email, '<null>') FROM personas WHERE persona_id = '${idCreada}';`)
  ok(enBase === '<null>', `en la base: email = ${enBase}`)

  paso('[7] Búsqueda por DNI')
  await irA('/personas')
  await esperar(() => filas() > 0)
  await buscarDni(dniConPuntos)
  ok(await esperar(() => location.search === `?dni=${DNI}` && filas() === 1 && texto().includes('Ana María')), `con puntos → 1 resultado, URL ?dni=${DNI}`)
  await buscarDni('12A')
  ok(await esperar(() => texto().includes('Deben ser de 6 a 8 dígitos')), 'DNI inválido → error en el buscador, sin llamar al back')
  await buscarDni('11111111')
  ok(await esperar(() => texto().includes('No hay ninguna persona con DNI 11111111')), 'inexistente → estado vacío')
  boton('Darla de alta').click()
  ok(await esperar(() => location.pathname === '/personas/nueva' && input('dni')?.value === '11111111'), '"Darla de alta" abre el alta con el DNI precargado')

  paso('[8] Paginación (8 personas más por API para pasar de 10)')
  for (let i = 1; i <= 8; i++) {
    await client.api('/api/personas', { method: 'POST', body: { dni: DNIS[i], nombre: `Pag${i}`, apellido: APELLIDO } })
  }
  await irA('/actividades')
  await esperar(() => h1() === 'Actividades')
  await irA('/personas') // salir y volver: el listado se vuelve a pedir
  const rango = () => document.querySelector('.MuiTablePagination-displayedRows')?.textContent
  ok(await esperar(() => filas() === 10 && rango()?.startsWith('1–10 de ')), `página 1: 10 filas, "${rango()}"`)
  document.querySelector('button[aria-label*="siguiente"]').click()
  ok(await esperar(() => location.search === '?pagina=1' && filas() >= 1),`página 2 (${filas()} filas), URL ?pagina=1`)
  const primera = document.querySelector('tbody tr td:nth-child(2)').textContent
  document.querySelector('tbody tr').click()
  ok(await esperar(() => location.pathname.split('/').length === 3 && location.pathname !== '/personas'), `click en la fila → detalle (${h1()})`)
  atras()
  ok(await esperar(() => location.search === '?pagina=1' && document.querySelector('tbody tr td:nth-child(2)')?.textContent === primera), '"atrás" vuelve a la página 2, no a la 1')

  paso('[9] Baja con confirmación desde el listado')
  const pag8 = (await client.api('/api/personas?activo=true')).find((p) => p.dni === DNIS[8])
  await irA('/personas')
  await buscarDni(pag8.dni)
  await esperar(() => filas() === 1 && texto().includes('Pag8'))
  const btnBaja = () => document.querySelector(`button[aria-label="Dar de baja a Pag8 ${APELLIDO}"]`)
  btnBaja().click()
  ok(await esperar(() => dialogo()?.textContent.includes(`¿Dar de baja a Pag8 ${APELLIDO} (DNI ${pag8.dni})?`)), `modal "¿Dar de baja a Pag8 ${APELLIDO}?"`)
  boton('Cancelar', dialogo()).click()
  ok(await esperar(() => !dialogo()), 'Cancelar cierra el modal sin dar de baja')
  btnBaja().click()
  await esperar(() => dialogo())
  red.lenta()
  boton('Dar de baja', dialogo()).click()
  ok(await esperar(() => boton('Dando de baja...', dialogo())?.disabled), 'botón "Dando de baja..." deshabilitado')
  ok(await esperar(() => !dialogo() && texto().includes(`Se dio de baja a Pag8 ${APELLIDO}`)), 'toast "Se dio de baja"')
  red.normal()
  ok(await esperar(() => texto().includes('Inactivo') && btnBaja()?.disabled), 'la fila se refresca: Inactivo y botón de baja deshabilitado')

  paso('[10] Reactivar y baja desde el detalle')
  await irA(`/personas/${pag8.personaId}`)
  ok(await esperar(() => texto().includes('Esta persona está dada de baja')), 'detalle de inactiva: aviso')
  boton('Reactivar').click()
  ok(await esperar(() => texto().includes(`Se reactivó a Pag8 ${APELLIDO}`) && boton('Dar de baja')), 'Reactivar → toast y vuelve a ofrecer "Dar de baja"')
  boton('Dar de baja').click()
  await esperar(() => dialogo())
  boton('Dar de baja', dialogo()).click()
  ok(await esperar(() => !dialogo() && texto().includes('Esta persona está dada de baja')), 'baja desde el detalle → se actualiza sin recargar')

  paso('[11] Error con reintentar')
  red.caida()
  await irA('/personas?estado=inactivos') // consulta que no está en caché
  ok(await esperar(() => texto().includes('No se pudieron cargar los datos') && texto().includes('No se pudo conectar con el servidor'), 15000), 'back caído → mensaje entendible')
  red.normal()
  boton('Reintentar').click()
  ok(await esperar(() => filas() > 0 && !texto().includes('No se pudo conectar')), 'Reintentar → carga los datos')

  paso('[12] Detalle inexistente / link inválido')
  await irA('/personas/abc')
  ok(await esperar(() => texto().includes('No existe la persona') && texto().includes('El link no es válido.')), '/personas/abc → "No existe la persona" (no muestra el error de Java)')
  await irA('/personas/00000000-0000-0000-0000-000000000000')
  ok(await esperar(() => texto().includes('No se encontró al socio')), 'UUID inexistente → mensaje del back')
  ok(!boton('Reintentar') && !!boton('Volver al listado'), 'sin "Reintentar", con "Volver al listado"')

  paso('[13] Estado vacío con filtros')
  await irA('/personas?estado=inactivos&socio=socios')
  await esperar(() => !document.querySelector('[aria-busy="true"]') && (filas() > 0 || texto().includes('No hay personas')))
  if (filas() === 0) {
    ok(texto().includes('No hay personas que coincidan con los filtros'), '"No hay personas que coincidan con los filtros"')
    boton('Limpiar filtros').click()
    ok(await esperar(() => location.search === '' && filas() > 0), '"Limpiar filtros" vuelve al listado')
  } else {
    console.log('  (salteado: hay socios inactivos en la base)')
  }

  paso('[14] Menú y consola')
  ok(document.querySelector('a.Mui-selected')?.textContent === 'Personas', '"Personas" resaltado en el menú')
  b.sinErroresDeReact()
} catch (e) {
  b.fallar(e.stack ?? e)
} finally {
  red.normal()
  // Limpieza: se borran SOLO los DNIs de esta corrida (y con apellido TEST-FRONT, doble condición).
  // Mismo orden que scripts/sql/limpiar-personas-test-front.sql: primero lo que cuelga de la persona.
  try {
    const lista = DNIS.map((d) => `'${d}'`).join(',')
    const filasSql = sql(`
      BEGIN;
      CREATE TEMP TABLE objetivo ON COMMIT DROP AS
        SELECT persona_id FROM personas WHERE apellido = '${APELLIDO}' AND dni IN (${lista});
      SELECT 'borradas', (SELECT count(*) FROM objetivo), (SELECT count(*) FROM membresias WHERE persona_id IN (SELECT persona_id FROM objetivo));
      DELETE FROM asistencias WHERE inscripcion_id IN (SELECT inscripcion_id FROM inscripciones WHERE persona_id IN (SELECT persona_id FROM objetivo));
      DELETE FROM inscripciones WHERE persona_id IN (SELECT persona_id FROM objetivo);
      DELETE FROM clases_prueba WHERE persona_id IN (SELECT persona_id FROM objetivo);
      DELETE FROM membresias WHERE persona_id IN (SELECT persona_id FROM objetivo);
      DELETE FROM personas WHERE persona_id IN (SELECT persona_id FROM objetivo);
      COMMIT;
      SELECT 'restantes', count(*) FROM personas WHERE apellido = '${APELLIDO}' AND dni IN (${lista});`)
    const [, personas, membresias] = filasSql.find((f) => f[0] === 'borradas')
    const [, restantes] = filasSql.find((f) => f[0] === 'restantes')
    console.log(`\n[limpieza] borradas ${personas} personas y ${membresias} membresías; quedan ${restantes}`)
    if (restantes !== '0') b.fallar('la limpieza dejó personas de prueba')
  } catch (e) {
    b.fallar(`limpieza: ${e.message}`)
  }
  await b.terminar()
}
