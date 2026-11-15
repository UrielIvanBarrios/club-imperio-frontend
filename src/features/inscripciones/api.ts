import { api } from '../../api/client'
import type { Inscripcion, InscripcionCreateRequest } from './types'

// Los dos listados traen solo las inscripciones activas
export const inscripcionesApi = {
  listarActivasPorSocio(dni: string) {
    return api<Inscripcion[]>(`/api/inscripciones/socio/${encodeURIComponent(dni)}`)
  },

  listarActivasPorComision(comisionId: string) {
    return api<Inscripcion[]>(`/api/inscripciones/comision/${comisionId}`)
  },

  inscribir({ dni, comisionId }: InscripcionCreateRequest) {
    return api<Inscripcion>(`/api/inscripciones?${new URLSearchParams({ dni, comisionId })}`, { method: 'POST' })
  },
}
