import { api, ApiError } from '../../api/client'
import type { Persona, PersonaCreateRequest, PersonaFiltros, PersonaUpdateRequest } from './types'

// Capa 1: una función por endpoint. No sabe nada de React ni de TanStack Query.

export const personasApi = {
  listar(filtros: PersonaFiltros = {}) {
    const params = new URLSearchParams()
    if (filtros.activo !== undefined) params.set('activo', String(filtros.activo))
    if (filtros.esSocio !== undefined) params.set('esSocio', String(filtros.esSocio))
    const qs = params.toString()
    return api<Persona[]>(`/api/personas${qs ? `?${qs}` : ''}`)
  },

  // El back responde 400 cuando el DNI no existe. Acá lo traducimos a null:
  // "no hay resultados" no es un error para la pantalla de búsqueda.
  async buscarPorDni(dni: string): Promise<Persona | null> {
    try {
      return await api<Persona>(`/api/personas/buscar?dni=${encodeURIComponent(dni)}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) return null
      throw e
    }
  },

  obtener(id: string) {
    return api<Persona>(`/api/personas/${id}`)
  },

  crear(data: PersonaCreateRequest) {
    return api<Persona>('/api/personas', { method: 'POST', body: data })
  },

  actualizar(id: string, data: PersonaUpdateRequest) {
    return api<Persona>(`/api/personas/${id}`, { method: 'PUT', body: data })
  },

  darDeBaja(id: string) {
    return api<void>(`/api/personas/${id}`, { method: 'DELETE' })
  },
}
