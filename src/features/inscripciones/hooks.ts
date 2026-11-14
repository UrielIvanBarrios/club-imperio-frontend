import { useQuery } from '@tanstack/react-query'
import { inscripcionesApi } from './api'

export const inscripcionesKeys = {
  all: ['inscripciones'] as const,
  porSocio: (dni: string) => [...inscripcionesKeys.all, 'socio', dni] as const,
}

export function useInscripcionesPorSocio(dni: string | undefined) {
  return useQuery({
    queryKey: inscripcionesKeys.porSocio(dni ?? ''),
    queryFn: () => inscripcionesApi.listarActivasPorSocio(dni!),
    enabled: !!dni,
  })
}
