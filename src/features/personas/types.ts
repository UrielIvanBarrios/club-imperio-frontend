// Contrato con el back: /api/personas (ver docs/api-spec.md del back).

export interface Membresia {
  id: string
  fechaAlta: string
  fechaBaja: string | null
  motivoBaja: string | null
}

export interface Persona {
  personaId: string
  dni: string
  nombre: string
  apellido: string
  fechaNacimiento: string | null
  telefonoPrincipal: string | null
  email: string | null
  activo: boolean
  fechaCreacion: string
  esSocioActivo: boolean
  membresias: Membresia[]
}

export interface PersonaCreateRequest {
  dni: string
  nombre: string
  apellido: string
  fechaNacimiento: string | null
  telefonoPrincipal: string | null
  email: string | null
  seAsocia: boolean
  fechaAltaManual: string | null // LocalDateTime "aaaa-mm-ddT00:00:00"
}

// El PUT no permite cambiar DNI, fecha de nacimiento ni membresía.
// Los campos null o en blanco el back los ignora (no pisan el valor).
export interface PersonaUpdateRequest {
  nombre?: string
  apellido?: string
  email?: string
  telefonoPrincipal?: string
  activo?: boolean
}

export interface PersonaFiltros {
  activo?: boolean
  esSocio?: boolean
}
