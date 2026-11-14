import type { Actividad } from '../actividades/types'

// Contrato con el back: /api/comisiones (ver docs/api-spec.md del back).
// Entidad JPA tal cual (sin DTO): trae la actividad completa anidada.
export interface Comision {
  comisionId: string
  actividad: Actividad
  nombre: string
  horario: string
  cupoMaximo: number | null // null = sin tope
  activa: boolean
}

// El alta va por query params: POST /api/comisiones?actividadId=&nombre=&horario=&cupo=
export interface ComisionCreateRequest {
  actividadId: string
  nombre: string
  horario: string
  cupo: number | null // null = sin tope
}

// Actualización parcial. No permite cambiar la actividad ni el estado (la baja es el DELETE).
// cupoMaximo null se ignora: una vez que la comisión tiene cupo, no se le puede quitar.
export interface ComisionUpdateRequest {
  nombre?: string
  horario?: string
  cupoMaximo?: number
}
