// npm run test:e2e → corre cada *.e2e.mjs en su propio proceso (cada uno monta la app de cero).
// npm run test:e2e -- personas → corre solo los que contengan "personas" en el nombre.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const filtro = process.argv[2] ?? ''
const pruebas = readdirSync(dir).filter((f) => f.endsWith('.e2e.mjs') && f.includes(filtro)).sort()

const resultados = []
for (const prueba of pruebas) {
  console.log(`\n================ ${prueba} ================`)
  const t0 = Date.now()
  // --no-warnings: oculta el aviso experimental de localStorage de Node
  const r = spawnSync(process.execPath, ['--no-warnings', join(dir, prueba)], { stdio: 'inherit' })
  resultados.push({ prueba, ok: r.status === 0, segundos: ((Date.now() - t0) / 1000).toFixed(1) })
}

console.log('\n================ Resumen ================')
for (const r of resultados) console.log(`${r.ok ? 'OK   ' : 'FALLA'}  ${r.prueba} (${r.segundos} s)`)
process.exit(resultados.every((r) => r.ok) && resultados.length > 0 ? 0 : 1)
