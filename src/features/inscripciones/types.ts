// El back devuelve las entidades JPA tal cual (sin DTO): comisión y actividad vienen anidadas.

export interface Actividad {
  actividadId: string
  nombre: string
  descripcion: string | null
  precioMensual: number
  activo: boolean
}

export interface Comision {
  comisionId: string
  actividad: Actividad
  nombre: string
  horario: string
  cupoMaximo: number | null
  activa: boolean
}

export interface Inscripcion {
  inscripcionId: string
  comision: Comision
  fechaInscripcion: string
  activo: boolean
  fechaBaja: string | null
}
