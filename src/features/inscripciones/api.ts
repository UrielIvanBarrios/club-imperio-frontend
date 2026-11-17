import { api } from '../../api/client'
import type { Inscripcion, InscripcionCreateRequest, InscripcionFiltros, InscripcionListado } from './types'

export const inscripcionesApi = {
  // Listado con filtros. Los vacíos no se mandan: el back los toma como "sin filtro".
  listar(filtros: InscripcionFiltros) {
    const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => !!v) as [string, string][]).toString()
    return api<InscripcionListado[]>(`/api/inscripciones${params ? `?${params}` : ''}`)
  },

  // Estos dos traen solo las inscripciones activas, con la persona y la comisión completas
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
