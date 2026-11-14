import { api } from '../../api/client'
import type { Inscripcion } from './types'

export const inscripcionesApi = {
  listarActivasPorSocio(dni: string) {
    return api<Inscripcion[]>(`/api/inscripciones/socio/${encodeURIComponent(dni)}`)
  },
}
