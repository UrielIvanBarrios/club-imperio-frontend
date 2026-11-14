import { api } from '../../api/client'
import type { Actividad, ActividadCreateRequest, ActividadUpdateRequest } from './types'

// Capa 1: una función por endpoint. No sabe nada de React ni de TanStack Query.
// (GET /api/actividades/buscar no se usa: es por nombre exacto. La búsqueda se hace en el front.)

export const actividadesApi = {
  listar() {
    return api<Actividad[]>('/api/actividades') // trae activas e inactivas
  },

  obtener(id: string) {
    return api<Actividad>(`/api/actividades/${id}`)
  },

  crear(data: ActividadCreateRequest) {
    return api<Actividad>('/api/actividades', { method: 'POST', body: data })
  },

  actualizar(id: string, data: ActividadUpdateRequest) {
    return api<Actividad>(`/api/actividades/${id}`, { method: 'PUT', body: data })
  },

  // Baja lógica en cascada: también da de baja sus comisiones y las inscripciones activas
  darDeBaja(id: string) {
    return api<void>(`/api/actividades/${id}`, { method: 'DELETE' })
  },
}
