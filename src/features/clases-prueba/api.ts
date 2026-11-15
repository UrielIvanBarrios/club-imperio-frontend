import { api } from '../../api/client'
import type { ClasePrueba, ClasePruebaCreateRequest } from './types'

// Capa 1: una función por endpoint. No sabe nada de React ni de TanStack Query.

export const clasesPruebaApi = {
  // Todas (el back no filtra ni tiene un GET por id)
  listar() {
    return api<ClasePrueba[]>('/api/clases-prueba')
  },

  registrar({ dni, actividadId, fecha }: ClasePruebaCreateRequest) {
    return api<ClasePrueba>(`/api/clases-prueba/registrar?${new URLSearchParams({ dni, actividadId, fecha })}`, { method: 'POST' })
  },

  // Pisa asistio. Las observaciones, solo si se mandan (las reemplaza, no concatena); sin el parámetro quedan como estaban.
  marcarAsistencia(id: string, asistio: boolean, observaciones?: string) {
    const params = new URLSearchParams({ asistio: String(asistio) })
    if (observaciones !== undefined) params.set('observaciones', observaciones)
    return api<void>(`/api/clases-prueba/${id}/asistencia?${params}`, { method: 'PATCH' })
  },

  // Concatena: "<anteriores> | Nota: <nota>"
  agregarObservacion(id: string, nota: string) {
    return api<void>(`/api/clases-prueba/${id}/observacion?${new URLSearchParams({ nota })}`, { method: 'PATCH' })
  },
}
