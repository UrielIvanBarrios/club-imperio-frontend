// Contrato con el back: /api/usuarios (solo ADMIN; ver docs/api-spec.md del back).
// Usuario y Rol ya están en api/types.ts porque también los usa el login.
export type { Rol, Usuario } from '../../api/types'
import type { Rol } from '../../api/types'

export interface UsuarioCreateRequest {
  email: string
  nombre: string
  password: string
  rol: Rol
}

// Actualización parcial: lo que viene null/ausente no se toca.
// password = el ADMIN le resetea la contraseña a otro usuario (sin pedir la actual).
// Con el id propio el back lo rechaza (400): la contraseña propia va por /api/auth/me/password.
export interface UsuarioUpdateRequest {
  email?: string
  nombre?: string
  rol?: Rol
  activo?: boolean
  password?: string
}
