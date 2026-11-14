import { useQuery } from '@tanstack/react-query'
import { inscripcionesApi } from './api'

export const inscripcionesKeys = {
  all: ['inscripciones'] as const,
  porSocio: (dni: string) => [...inscripcionesKeys.all, 'socio', dni] as const,
  porComision: (comisionId: string) => [...inscripcionesKeys.all, 'comision', comisionId] as const,
}

export function useInscripcionesPorSocio(dni: string | undefined) {
  return useQuery({
    queryKey: inscripcionesKeys.porSocio(dni ?? ''),
    queryFn: () => inscripcionesApi.listarActivasPorSocio(dni!),
    enabled: !!dni,
  })
}

// Inscriptos activos de una comisión: el detalle los lista y con su cantidad calcula el cupo ocupado.
export function useInscripcionesPorComision(comisionId: string | undefined) {
  return useQuery({
    queryKey: inscripcionesKeys.porComision(comisionId ?? ''),
    queryFn: () => inscripcionesApi.listarActivasPorComision(comisionId!),
    enabled: !!comisionId,
  })
}
