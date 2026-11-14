import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { comisionesKeys } from '../comisiones/hooks'
import { inscripcionesKeys } from '../inscripciones/hooks'
import { actividadesApi } from './api'
import type { Actividad, ActividadUpdateRequest } from './types'

// Capa 2: hooks de TanStack Query. Las pantallas usan esto, nunca actividadesApi directo.

export const actividadesKeys = {
  all: ['actividades'] as const,
  list: () => [...actividadesKeys.all, 'list'] as const,
  detail: (id: string) => [...actividadesKeys.all, 'detail', id] as const,
}

// ---------- Lecturas ----------

export function useActividades() {
  return useQuery({ queryKey: actividadesKeys.list(), queryFn: actividadesApi.listar })
}

export function useActividad(id: string | undefined) {
  return useQuery({
    queryKey: actividadesKeys.detail(id ?? ''),
    queryFn: () => actividadesApi.obtener(id!),
    enabled: !!id,
  })
}

// ---------- Escrituras ----------

export function useCrearActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: actividadesApi.crear,
    onSuccess: (actividad) => {
      qc.invalidateQueries({ queryKey: actividadesKeys.all })
      qc.setQueryData(actividadesKeys.detail(actividad.actividadId), actividad)
    },
  })
}

export function useActualizarActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActividadUpdateRequest }) => actividadesApi.actualizar(id, data),
    onSuccess: (actividad) => {
      qc.invalidateQueries({ queryKey: actividadesKeys.all })
      // Las comisiones e inscripciones traen la actividad anidada (nombre, precio): también quedan viejas
      qc.invalidateQueries({ queryKey: comisionesKeys.all })
      qc.invalidateQueries({ queryKey: inscripcionesKeys.all })
      qc.setQueryData(actividadesKeys.detail(actividad.actividadId), actividad)
    },
  })
}

export function useDarDeBajaActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (actividad: Actividad) => actividadesApi.darDeBaja(actividad.actividadId),
    // La baja es en cascada en el back: se invalidan también comisiones e inscripciones
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: actividadesKeys.all }),
      qc.invalidateQueries({ queryKey: comisionesKeys.all }),
      qc.invalidateQueries({ queryKey: inscripcionesKeys.all }),
    ]),
  })
}
