import type { Actividad } from '../actividades/types'

// Entidad JPA tal cual (sin DTO): trae la actividad completa anidada.
export interface Comision {
  comisionId: string
  actividad: Actividad
  nombre: string
  horario: string
  cupoMaximo: number | null // null = sin tope
  activa: boolean
}
