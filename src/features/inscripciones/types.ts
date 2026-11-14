import type { Comision } from '../comisiones/types'

// El back devuelve la entidad JPA tal cual (sin DTO): la comisión y su actividad vienen anidadas.
export interface Inscripcion {
  inscripcionId: string
  comision: Comision
  fechaInscripcion: string
  activo: boolean
  fechaBaja: string | null
}
