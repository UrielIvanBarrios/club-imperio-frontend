import { api } from '../../api/client'
import type { Usuario } from '../../api/types'

export interface CambioPasswordRequest {
  passwordActual: string
  passwordNueva: string
}

// Endpoints del usuario logueado: valen para ADMIN y USER (el id sale del token, no de la URL).
export const perfilApi = {
  // 401 si el usuario fue desactivado → el cliente HTTP cierra la sesión
  me() {
    return api<Usuario>('/api/auth/me')
  },

  // 400 (no 401) si la actual es incorrecta: así el front no cierra la sesión
  cambiarPassword(data: CambioPasswordRequest) {
    return api<void>('/api/auth/me/password', { method: 'PUT', body: data })
  },
}
