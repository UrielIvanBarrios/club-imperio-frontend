import { api } from '../../api/client'
import type { Comision } from './types'

export const comisionesApi = {
  // Por defecto el back trae solo las activas
  listarPorActividad(actividadId: string, incluirInactivas = false) {
    return api<Comision[]>(`/api/comisiones/actividad/${actividadId}?incluirInactivas=${incluirInactivas}`)
  },
}
