import type { Comision } from '../comisiones/types'

// La comisión (con su actividad) viene anidada tal cual la entidad; la persona, como PersonaResponse
// (el mismo DTO de /api/personas). De la persona se tipa solo lo que usa el front.
// Lo comparten Inscripción, Asistencia (dentro de su inscripción) y Clase de prueba.
export interface InscripcionPersona {
  personaId: string
  dni: string
  nombre: string
  apellido: string
  activo: boolean
  esSocioActivo: boolean
}

export interface Inscripcion {
  inscripcionId: string
  persona: InscripcionPersona
  comision: Comision
  fechaInscripcion: string
  activo: boolean
  fechaBaja: string | null
}

// El alta va por query params: POST /api/inscripciones?dni=&comisionId=
// El back valida persona activa, comisión activa, que no esté ya inscripto y el cupo (todo 400 con mensaje).
export interface InscripcionCreateRequest {
  dni: string
  comisionId: string
}
