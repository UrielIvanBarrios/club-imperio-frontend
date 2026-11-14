// E2E: pantalla 17, Importar socios (ADMIN), contra el back real, con api-tests/socios-ejemplo.csv del back
// (7 filas: 4 válidas y 3 con error a propósito). Al final se borran por SQL las personas importadas.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FRONT, sql } from './lib/config.mjs'
import { crearNavegador } from './lib/harness.mjs'

const b = await crearNavegador('/importar')
const { w, ok, paso, texto, esperar, boton, irA, h1, client, red } = b

const EJEMPLO = resolve(FRONT, '../club-imperio-backend/api-tests/socios-ejemplo.csv')
const [[inicio]] = sql('SELECT now();') // la limpieza solo toca personas creadas después de esto
let importados = [] // DNIs que devolvió la importación real

// ---------- helpers de archivos ----------
const archivo = (nombre, contenido) => new w.File([contenido], nombre, { type: nombre.endsWith('.csv') ? 'text/csv' : 'application/octet-stream' })
// Elegir con el diálogo del sistema: se cargan los files en el <input type="file"> y se dispara change
const elegirArchivo = (f) => {
  const el = document.querySelector('[data-testid="input-archivo"]')
  Object.defineProperty(el, 'files', { value: [f], configurable: true })
  el.dispatchEvent(new w.Event('change', { bubbles: true }))
}
// Arrastrar y soltar sobre la zona
const soltarArchivo = (f) => {
  const zona = document.querySelector('[aria-label="Elegir o arrastrar el archivo de socios"]')
  for (const tipo of ['dragover', 'drop']) {
    const ev = new w.Event(tipo, { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'dataTransfer', { value: { files: [f], types: ['Files'] } })
    zona.dispatchEvent(ev)
  }
}
const total = (label) => document.querySelector(`[aria-label^="${label}: "]`)?.getAttribute('aria-label').split(': ')[1]
const filaDe = (txt) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(txt))
const pasoActivo = () => document.querySelector('.MuiStepLabel-label.Mui-active')?.textContent
const alerta = () => document.querySelector('.MuiAlert-colorError')?.textContent ?? ''
const validar = () => boton('Validar archivo').click()

try {
  await b.sesionAdmin()

  paso('[1] Pantalla inicial')
  await b.montarApp()
  ok(await esperar(() => h1() === 'Importar socios'), 'título "Importar socios"')
  ok(pasoActivo() === 'Elegir archivo', 'paso activo: "Elegir archivo"')
  ok(boton('Validar archivo')?.disabled, '"Validar archivo" deshabilitado hasta elegir un archivo')
  ok(document.querySelector('a.Mui-selected')?.textContent === 'Importar socios', '"Importar socios" resaltado en el menú')

  paso('[2] Descargar la plantilla')
  let descargado = null
  let nombreDescarga = null
  const createObjectURL = URL.createObjectURL
  URL.createObjectURL = (blob) => { descargado = blob; return 'blob:prueba' }
  const clickOriginal = w.HTMLAnchorElement.prototype.click
  w.HTMLAnchorElement.prototype.click = function () { nombreDescarga = this.download } // jsdom no hace descargas
  boton('Descargar plantilla').click()
  ok(await esperar(() => nombreDescarga === 'plantilla-socios.csv'), `se descarga "${nombreDescarga}"`)
  w.HTMLAnchorElement.prototype.click = clickOriginal
  URL.createObjectURL = createObjectURL
  // Se leen los bytes: Blob.text() decodifica UTF-8 y, por estándar, descarta el BOM
  const bytes = new Uint8Array(await descargado.arrayBuffer())
  ok(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, 'empieza con el BOM UTF-8 (para que Excel muestre bien las tildes)')
  ok(new TextDecoder().decode(bytes).startsWith('dni;nombre;apellido'), 'encabezado dni;nombre;apellido… separado con ;')

  paso('[3] Archivo con otra extensión → se rechaza sin llamar al back')
  soltarArchivo(archivo('socios.txt', 'dni;nombre;apellido\n1;a;b'))
  ok(await esperar(() => alerta().includes('Formato no soportado') && alerta().includes('"socios.txt" no es un .csv ni un .xlsx')), 'aviso "Formato no soportado"')
  ok(boton('Validar archivo').disabled, 'sigue sin poder validar')

  paso('[4] Faltan columnas obligatorias → 400 con el mensaje del back')
  elegirArchivo(archivo('sin-columnas.csv', 'documento_mal;otra\n123;x\n'))
  ok(await esperar(() => texto().includes('sin-columnas.csv') && !boton('Validar archivo').disabled), 'el archivo elegido se muestra y se puede validar')
  validar()
  ok(await esperar(() => alerta().startsWith('No se pudo procesar el archivo') && alerta().includes('Faltan columnas obligatorias en el encabezado')), `"${alerta().slice(0, 110)}…"`)
  ok(!document.querySelector('.MuiAlert-standardError button'), 'sin "Reintentar" (el mismo archivo daría lo mismo)')

  paso('[5] Archivo dañado → 400')
  elegirArchivo(archivo('roto.xlsx', 'esto no es un excel'))
  await esperar(() => !alerta())
  validar()
  ok(await esperar(() => alerta().startsWith('No se pudo procesar el archivo') && /dañado|no es un Excel válido/.test(alerta())), `"${alerta().slice(0, 110)}"`)

  paso('[6] Más de 5 MB → 413')
  const grande = 'dni;nombre;apellido\n' + '12345678;Nombre;Apellido\n'.repeat(260000) // ~6,5 MB
  elegirArchivo(archivo('enorme.csv', grande))
  await esperar(() => !alerta())
  validar()
  ok(await esperar(() => alerta().startsWith('El archivo es demasiado grande'), 20000), `"${alerta().slice(0, 140)}"`)
  ok(alerta().includes('Dividí la planilla en partes más chicas'), 'con una sugerencia de qué hacer')

  paso('[7] Simulación con socios-ejemplo.csv (arrastrándolo)')
  soltarArchivo(archivo('socios-ejemplo.csv', readFileSync(EJEMPLO)))
  ok(await esperar(() => texto().includes('socios-ejemplo.csv') && !alerta()), 'el archivo arrastrado se muestra y se limpia el error anterior')
  red.lenta()
  validar()
  ok(await esperar(() => boton('Validando...')?.disabled), 'botón "Validando..." deshabilitado')
  red.normal()
  ok(await esperar(() => pasoActivo() === 'Revisar'), 'paso activo: "Revisar"')
  ok(texto().includes('Vista previa: todavía no se guardó nada'), 'aviso de vista previa')
  ok(total('Filas en el archivo') === '7' && total('Válidas') === '4' && total('Con error') === '3', `totales: ${total('Filas en el archivo')} filas, ${total('Válidas')} válidas, ${total('Con error')} con error`)
  ok(!total('Importadas'), 'en la simulación no hay "Importadas"')
  ok(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Con error (3)', 'abre en la pestaña "Con error (3)"')
  ok(filaDe('34A55666')?.textContent.includes('DNI con formato inválido') && filaDe('34A55666').querySelector('td').textContent === '6', 'fila 6: DNI con letras')
  const fila7 = [...document.querySelectorAll('tbody tr')].find((tr) => tr.querySelector('td')?.textContent === '7')
  ok(fila7?.textContent.includes('30111222') && /fila 2/i.test(fila7.textContent), `fila 7: DNI repetido, indica la primera aparición ("${fila7?.querySelector('li')?.textContent}")`)
  const fila8 = [...document.querySelectorAll('tbody tr')].find((tr) => tr.querySelector('td')?.textContent === '8')
  ok(fila8?.querySelectorAll('li').length >= 3, `fila 8: todos sus errores juntos (${fila8?.querySelectorAll('li').length})`)
  ;[...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.startsWith('Válidas')).click()
  ok(await esperar(() => document.querySelectorAll('tbody tr').length === 4 && !!filaDe('32333444')), 'pestaña "Válidas": 4 filas, el DNI 32.333.444 normalizado')
  ok(filaDe('30111222')?.textContent.includes('Fernández, Lucía') && filaDe('30111222').textContent.includes('Sí'), 'Lucía Fernández, socia')
  ok((await client.api('/api/personas/buscar?dni=30111222').then(() => 'existe', () => 'no existe')) === 'no existe', 'la simulación no guardó nada en la base')
  ok(boton('Importar 4 socios') && !boton('Importar 4 socios').disabled, 'botón "Importar 4 socios"')

  paso('[8] Importación real')
  red.lenta()
  boton('Importar 4 socios').click()
  ok(await esperar(() => boton('Importando...')?.disabled), 'botón "Importando..." deshabilitado')
  red.normal()
  ok(await esperar(() => texto().includes('Se importaron 4 socios')), '"Se importaron 4 socios"')
  ok(total('Importadas') === '4', 'total "Importadas: 4"')
  ok(texto().includes('Las 3 filas con error no se importaron.'), 'aclara que las 3 con error no se importaron')
  const real = await client.api('/api/personas?activo=true')
  importados = ['30111222', '31222333', '32333444', '33444555'].filter((d) => real.some((p) => p.dni === d))
  ok(importados.length === 4, `las 4 personas están en la base (${importados.join(', ')})`)
  ok(real.find((p) => p.dni === '30111222')?.esSocioActivo && !real.find((p) => p.dni === '32333444')?.esSocioActivo, 'con su membresía: Lucía socia, Valentina no')

  paso('[9] El listado de Personas ya las muestra')
  boton('Ver socios').click()
  ok(await esperar(() => location.pathname === '/personas' && !!filaDe('Fernández, Lucía')), 'Ver socios → Personas, con las importadas')

  paso('[10] Importar el mismo archivo otra vez → ahora todo son duplicados')
  await irA('/importar')
  await esperar(() => h1() === 'Importar socios')
  elegirArchivo(archivo('socios-ejemplo.csv', readFileSync(EJEMPLO)))
  await esperar(() => !boton('Validar archivo')?.disabled)
  validar()
  ok(await esperar(() => total('Válidas') === '0' && total('Con error') === '7'), `0 válidas y 7 con error (${total('Válidas')} / ${total('Con error')})`)
  ok(texto().includes('Ninguna fila es válida'), 'aviso "Ninguna fila es válida"')
  ok(!!filaDe('30111222')?.textContent.match(/existe|registrad/i), 'el DNI ya importado aparece como existente')
  ok(boton('Importar 0 socios')?.disabled, 'no se puede importar')
  boton('Elegir otro archivo').click()
  ok(await esperar(() => pasoActivo() === 'Elegir archivo' && texto().includes('Arrastrá el archivo acá')), '"Elegir otro archivo" vuelve al primer paso')

  paso('[11] Back caído → Reintentar')
  elegirArchivo(archivo('socios-ejemplo.csv', readFileSync(EJEMPLO)))
  await esperar(() => !boton('Validar archivo')?.disabled)
  red.caida()
  validar()
  ok(await esperar(() => alerta().startsWith('No se pudo validar el archivo') && !!boton('Reintentar'), 15000), 'sin conexión → "No se pudo validar el archivo" + Reintentar')
  red.normal()
  boton('Reintentar').click()
  ok(await esperar(() => pasoActivo() === 'Revisar'), 'Reintentar → llega a la vista previa')

  b.sinErroresDeReact()
} catch (e) {
  b.fallar(e.stack ?? e)
} finally {
  red.normal()
  // Limpieza: solo las personas del archivo de ejemplo creadas durante esta corrida (DNI + fecha de creación).
  try {
    const dnis = ['30111222', '31222333', '32333444', '33444555'].map((d) => `'${d}'`).join(',')
    const filasSql = sql(`
      BEGIN;
      CREATE TEMP TABLE obj ON COMMIT DROP AS
        SELECT persona_id FROM personas WHERE dni IN (${dnis}) AND fecha_creacion >= '${inicio}';
      SELECT 'borradas', (SELECT count(*) FROM obj), (SELECT count(*) FROM membresias WHERE persona_id IN (SELECT persona_id FROM obj));
      DELETE FROM asistencias WHERE inscripcion_id IN (SELECT inscripcion_id FROM inscripciones WHERE persona_id IN (SELECT persona_id FROM obj));
      DELETE FROM inscripciones WHERE persona_id IN (SELECT persona_id FROM obj);
      DELETE FROM clases_prueba WHERE persona_id IN (SELECT persona_id FROM obj);
      DELETE FROM membresias WHERE persona_id IN (SELECT persona_id FROM obj);
      DELETE FROM personas WHERE persona_id IN (SELECT persona_id FROM obj);
      COMMIT;
      SELECT 'restantes', count(*) FROM personas WHERE dni IN (${dnis}) AND fecha_creacion >= '${inicio}';`)
    const [, personas, membresias] = filasSql.find((f) => f[0] === 'borradas')
    const [, restantes] = filasSql.find((f) => f[0] === 'restantes')
    console.log(`\n[limpieza] borradas ${personas} personas importadas y ${membresias} membresías; quedan ${restantes}`)
    if (restantes !== '0' || (importados.length && personas !== String(importados.length))) b.fallar('la limpieza no borró exactamente lo importado')
  } catch (e) {
    b.fallar(`limpieza: ${e.message}`)
  }
  await b.terminar()
}
