import type { Inscripcion } from '../inscripciones/types'

// Contrato con el back: /api/asistencias (ver docs/api-spec.md del back).
// Entidad JPA tal cual (sin DTO): trae la inscripción completa anidada.
export interface Asistencia {
  asistenciaId: string
  inscripcion: Inscripcion
  fecha: string // LocalDate "aaaa-mm-dd"
  presente: boolean
  observaciones: string | null
}

// POST /api/asistencias/clase: toda la clase en una transacción. Si una fila es inválida, no se guarda ninguna
// y el back devuelve 400 con todos los errores juntos ("Fila 2 (Apellido, Nombre): ...").
export interface AsistenciaClaseRequest {
  comisionId: string
  fecha: string
  asistencias: { inscripcionId: string; presente: boolean }[]
}

// PUT /api/asistencias/{id}: lo que no se manda no se modifica. La planilla solo corrige presente / ausente.
export interface AsistenciaUpdateRequest {
  presente?: boolean
}
