// Tipos que devuelve el back (ver docs/api-spec.md del back).

export type Rol = 'ADMIN' | 'USER'

export interface Usuario {
  usuarioId: string
  email: string
  nombre: string
  rol: Rol
  activo: boolean
  fechaCreacion: string
  fechaUltimaModificacion: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  tipo: 'Bearer'
  expiraEn: string // instante ISO-8601 UTC
  usuario: Usuario
}

// Cuerpo de todos los errores del back (GlobalExceptionHandler)
export interface ErrorBody {
  timestamp: string
  message: string
  status: number
}
