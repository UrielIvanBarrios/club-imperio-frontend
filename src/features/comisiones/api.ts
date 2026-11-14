import { api } from '../../api/client'
import type { Comision, ComisionCreateRequest, ComisionUpdateRequest } from './types'

// Capa 1: una función por endpoint. No sabe nada de React ni de TanStack Query.
// (El back no tiene "listar todas": se listan por actividad.)

export const comisionesApi = {
  // Por defecto el back trae solo las activas
  listarPorActividad(actividadId: string, incluirInactivas = false) {
    return api<Comision[]>(`/api/comisiones/actividad/${actividadId}?incluirInactivas=${incluirInactivas}`)
  },

  obtener(id: string) {
    return api<Comision>(`/api/comisiones/${id}`)
  },

  crear({ actividadId, nombre, horario, cupo }: ComisionCreateRequest) {
    const params = new URLSearchParams({ actividadId, nombre, horario })
    if (cupo !== null) params.set('cupo', String(cupo)) // sin el parámetro = sin tope
    return api<Comision>(`/api/comisiones?${params}`, { method: 'POST' })
  },

  actualizar(id: string, data: ComisionUpdateRequest) {
    return api<Comision>(`/api/comisiones/${id}`, { method: 'PUT', body: data })
  },

  // Baja lógica en cascada: también da de baja sus inscripciones activas
  darDeBaja(id: string) {
    return api<void>(`/api/comisiones/${id}`, { method: 'DELETE' })
  },
}
