// Fechas del back: LocalDate "1996-11-15" o LocalDateTime "2026-04-05T18:20:00.67".
// Se cortan como texto en vez de usar new Date(): "1996-11-15" se interpreta en UTC
// y en Argentina (UTC-3) se mostraría como 14/11.
export function formatFecha(iso?: string | null): string {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

const PESOS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
// 12500 → "$ 12.500,00"
export const formatPrecio = (n: number) => PESOS.format(n)

// "1 presente", "3 ausentes" (sirve para palabras que forman el plural con "s")
export const contar = (n: number, singular: string) => `${n} ${n === 1 ? singular : `${singular}s`}`

// Hoy en formato "aaaa-mm-dd", en hora local (es lo que usa <input type="date">).
export function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const esUuid = (valor?: string): valor is string => !!valor && UUID.test(valor)
