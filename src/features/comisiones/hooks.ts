import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { inscripcionesKeys } from '../inscripciones/hooks'
import { comisionesApi } from './api'
import type { Comision, ComisionUpdateRequest } from './types'

// Capa 2: hooks de TanStack Query. Las pantallas usan esto, nunca comisionesApi directo.

export const comisionesKeys = {
  all: ['comisiones'] as const,
  porActividad: (actividadId: string, incluirInactivas: boolean) =>
    [...comisionesKeys.all, 'actividad', actividadId, { incluirInactivas }] as const,
  detail: (id: string) => [...comisionesKeys.all, 'detail', id] as const,
}

// ---------- Lecturas ----------

export function useComisionesPorActividad(actividadId: string | undefined, { incluirInactivas = false } = {}) {
  return useQuery({
    queryKey: comisionesKeys.porActividad(actividadId ?? '', incluirInactivas),
    queryFn: () => comisionesApi.listarPorActividad(actividadId!, incluirInactivas),
    enabled: !!actividadId,
  })
}

// "Todas las actividades": el back no tiene un endpoint que traiga todas las comisiones,
// así que se pide una lista por actividad, en paralelo, y se juntan. Usa las mismas claves
// que useComisionesPorActividad: si ya se vio una actividad, esa parte sale de la caché.
export function useComisionesDeActividades(actividadIds: string[] | undefined, { incluirInactivas = false } = {}) {
  return useQueries({
    queries: (actividadIds ?? []).map((id) => ({
      queryKey: comisionesKeys.porActividad(id, incluirInactivas),
      queryFn: () => comisionesApi.listarPorActividad(id, incluirInactivas),
    })),
    combine: (resultados) => ({
      data: resultados.every((r) => r.data) ? resultados.flatMap((r) => r.data!) : undefined,
      isPending: !actividadIds || resultados.some((r) => r.isPending),
      isFetching: resultados.some((r) => r.isFetching),
      error: resultados.find((r) => r.error)?.error ?? null,
      refetch: () => Promise.all(resultados.map((r) => r.refetch())),
    }),
  })
}

export function useComision(id: string | undefined) {
  return useQuery({
    queryKey: comisionesKeys.detail(id ?? ''),
    queryFn: () => comisionesApi.obtener(id!),
    enabled: !!id,
  })
}

// ---------- Escrituras ----------

export function useCrearComision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: comisionesApi.crear,
    onSuccess: (comision) => {
      qc.invalidateQueries({ queryKey: comisionesKeys.all })
      qc.setQueryData(comisionesKeys.detail(comision.comisionId), comision)
    },
  })
}

export function useActualizarComision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ComisionUpdateRequest }) => comisionesApi.actualizar(id, data),
    onSuccess: (comision) => {
      qc.invalidateQueries({ queryKey: comisionesKeys.all })
      // Las inscripciones traen la comisión anidada (nombre, horario): también quedan viejas
      qc.invalidateQueries({ queryKey: inscripcionesKeys.all })
      qc.setQueryData(comisionesKeys.detail(comision.comisionId), comision)
    },
  })
}

export function useDarDeBajaComision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comision: Comision) => comisionesApi.darDeBaja(comision.comisionId),
    // La baja es en cascada en el back: también cambian las inscripciones
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: comisionesKeys.all }),
      qc.invalidateQueries({ queryKey: inscripcionesKeys.all }),
    ]),
  })
}
