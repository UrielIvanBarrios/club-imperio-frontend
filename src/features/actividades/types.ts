// Contrato con el back: /api/actividades (ver docs/api-spec.md del back).
// El back recibe y devuelve la entidad JPA (sin DTO): por eso el front solo manda los campos editables.

export interface Actividad {
  actividadId: string
  nombre: string
  descripcion: string | null
  precioMensual: number
  activo: boolean
}

export interface ActividadCreateRequest {
  nombre: string
  descripcion: string | null
  precioMensual: number
}

// Actualización parcial: ausente/null no se toca; descripcion "" la borra; nombre "" es un 400.
export interface ActividadUpdateRequest {
  nombre?: string
  descripcion?: string
  precioMensual?: number
  activo?: boolean
}
