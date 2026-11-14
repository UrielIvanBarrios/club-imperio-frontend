import type { Comision } from '../comisiones/types'

// El back devuelve la entidad JPA tal cual (sin DTO): la persona y la comisión (con su actividad) vienen anidadas.
// De la persona se tipa solo lo que usa el front.
export interface InscripcionPersona {
  personaId: string
  dni: string
  nombre: string
  apellido: string
  activo: boolean
}

export interface Inscripcion {
  inscripcionId: string
  persona: InscripcionPersona
  comision: Comision
  fechaInscripcion: string
  activo: boolean
  fechaBaja: string | null
}
