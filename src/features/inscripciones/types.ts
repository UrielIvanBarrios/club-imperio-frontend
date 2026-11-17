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

// ---------- Listado con filtros: GET /api/inscripciones ----------

export type EstadoInscripcion = 'activas' | 'bajas' | 'todas'

// Todos opcionales y combinables (AND). Sin estado, el back trae las activas.
// q busca por DNI (parcial o con puntos) o por nombre y apellido, sin tildes ni mayúsculas.
export interface InscripcionFiltros {
  actividadId?: string
  comisionId?: string
  q?: string
  estado?: EstadoInscripcion
}

// InscripcionListadoResponse: versión reducida para la tabla, que el back arma en una sola consulta.
// A diferencia de Inscripcion, la actividad viene aparte (no dentro de la comisión) y la persona sin su estado.
// El back la devuelve ordenada por apellido y nombre (y después actividad, comisión y fecha).
export interface InscripcionListado {
  inscripcionId: string
  fechaInscripcion: string
  activo: boolean
  fechaBaja: string | null
  persona: { personaId: string; dni: string; nombre: string; apellido: string; esSocioActivo: boolean }
  comision: { comisionId: string; nombre: string; horario: string }
  actividad: { actividadId: string; nombre: string }
}
