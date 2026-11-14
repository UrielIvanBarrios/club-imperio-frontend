// Configuración de las pruebas E2E: credenciales del ADMIN, acceso a PostgreSQL y psql.
// Primero se leen variables de entorno; si faltan, se toman del application.properties
// del back (../club-imperio-backend), que en la máquina de desarrollo ya está.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FRONT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const PROPS = resolve(FRONT, '../club-imperio-backend/src/main/resources/application.properties')

function propiedadDelBack(clave) {
  if (!existsSync(PROPS)) return undefined
  const linea = readFileSync(PROPS, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${clave}=`))
  return linea?.slice(clave.length + 1).trim()
}

function requerida(nombre, valor) {
  if (!valor) {
    console.error(`Falta ${nombre}. Definila como variable de entorno (ver scripts/e2e/README.md).`)
    process.exit(2)
  }
  return valor
}

const psqlWindows = 'C:/Program Files/PostgreSQL/18/bin/psql.exe'

export const config = {
  apiUrl: process.env.VITE_API_URL ?? 'http://localhost:8080',
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? propiedadDelBack('app.admin.email') ?? 'admin@clubimperio.com',
    password: requerida('E2E_ADMIN_PASSWORD', process.env.E2E_ADMIN_PASSWORD ?? propiedadDelBack('app.admin.password')),
  },
  db: {
    host: process.env.PGHOST ?? 'localhost',
    user: process.env.PGUSER ?? 'postgres',
    database: process.env.PGDATABASE ?? 'club_imperio',
    password: requerida('E2E_DB_PASSWORD', process.env.E2E_DB_PASSWORD ?? propiedadDelBack('spring.datasource.password')),
  },
  psql: process.env.E2E_PSQL ?? (existsSync(psqlWindows) ? psqlWindows : 'psql'),
}

// Corre SQL con psql y devuelve las filas como arrays de strings.
// Se usa solo para la limpieza final: el back no tiene borrado físico.
export function sql(consulta) {
  const r = spawnSync(
    config.psql,
    ['-h', config.db.host, '-U', config.db.user, '-d', config.db.database, '-At', '-F', '|', '-q', '-v', 'ON_ERROR_STOP=1'],
    { input: consulta, env: { ...process.env, PGPASSWORD: config.db.password }, encoding: 'utf8' },
  )
  if (r.error) throw new Error(`No se pudo ejecutar psql (${config.psql}): ${r.error.message}`)
  if (r.status !== 0) throw new Error(r.stderr.trim())
  return r.stdout.split(/\r?\n/).filter(Boolean).map((l) => l.split('|'))
}
