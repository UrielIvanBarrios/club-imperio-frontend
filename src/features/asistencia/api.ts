import { api } from '../../api/client'
import type { Asistencia, AsistenciaClaseRequest, AsistenciaUpdateRequest } from './types'

// Capa 1: una función por endpoint. No sabe nada de React ni de TanStack Query.

export const asistenciasApi = {
  // Lo cargado de una clase: [] si todavía no se cargó. Ordenado por apellido y nombre.
  deClase(comisionId: string, fecha: string) {
    return api<Asistencia[]>(`/api/asistencias/comision/${comisionId}?${new URLSearchParams({ fecha })}`)
  },

  // Todo o nada
  registrarClase(body: AsistenciaClaseRequest) {
    return api<Asistencia[]>('/api/asistencias/clase', { method: 'POST', body })
  },

  corregir(asistenciaId: string, body: AsistenciaUpdateRequest) {
    return api<Asistencia>(`/api/asistencias/${asistenciaId}`, { method: 'PUT', body })
  },

  // Más reciente primero
  historial(inscripcionId: string) {
    return api<Asistencia[]>(`/api/asistencias/historial/${inscripcionId}`)
  },
}
