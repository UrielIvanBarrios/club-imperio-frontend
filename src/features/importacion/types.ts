// Contrato con el back: POST /api/personas/importar (solo ADMIN; ver docs/api-spec.md del back).
// "fila" es el número de fila como se ve en Excel (la 1 es el encabezado).

export interface FilaValida {
  fila: number
  dni: string
  nombre: string
  apellido: string
  socio: boolean
}

export interface FilaConError {
  fila: number
  dni: string | null
  errores: string[] // todos los errores de la fila, no solo el primero
}

export interface ReporteImportacion {
  archivo: string
  simulacion: boolean // true = solo se validó, no se guardó nada
  totalFilas: number
  filasValidas: number
  filasConError: number
  importadas: number // 0 en una simulación
  validas: FilaValida[]
  errores: FilaConError[]
}
