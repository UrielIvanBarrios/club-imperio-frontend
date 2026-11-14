import { useQuery } from '@tanstack/react-query'
import { comisionesApi } from './api'

export const comisionesKeys = {
  all: ['comisiones'] as const,
  porActividad: (actividadId: string, incluirInactivas: boolean) =>
    [...comisionesKeys.all, 'actividad', actividadId, { incluirInactivas }] as const,
}

export function useComisionesPorActividad(actividadId: string | undefined, { incluirInactivas = false } = {}) {
  return useQuery({
    queryKey: comisionesKeys.porActividad(actividadId ?? '', incluirInactivas),
    queryFn: () => comisionesApi.listarPorActividad(actividadId!, incluirInactivas),
    enabled: !!actividadId,
  })
}
