import { api } from '../../api/client'
import type { Usuario, UsuarioCreateRequest, UsuarioUpdateRequest } from './types'

// Capa 1: una función por endpoint. Con un token de USER, todos responden 403.

export const usuariosApi = {
  listar() {
    return api<Usuario[]>('/api/usuarios') // activos e inactivos
  },

  obtener(id: string) {
    return api<Usuario>(`/api/usuarios/${id}`)
  },

  crear(data: UsuarioCreateRequest) {
    return api<Usuario>('/api/usuarios', { method: 'POST', body: data })
  },

  actualizar(id: string, data: UsuarioUpdateRequest) {
    return api<Usuario>(`/api/usuarios/${id}`, { method: 'PUT', body: data })
  },

  // Baja lógica: el usuario ya no puede loguearse. Se reactiva con actualizar({ activo: true }).
  desactivar(id: string) {
    return api<void>(`/api/usuarios/${id}`, { method: 'DELETE' })
  },
}
