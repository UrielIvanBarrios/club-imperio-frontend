import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { inscripcionesKeys } from '../inscripciones/hooks'
import { asistenciasApi } from './api'
import type { Asistencia, AsistenciaClaseRequest } from './types'

// Capa 2: hooks de TanStack Query. Las pantallas usan esto, nunca asistenciasApi directo.

export const asistenciasKeys = {
  all: ['asistencias'] as const,
  clase: (comisionId: string, fecha: string) => [...asistenciasKeys.all, 'clase', comisionId, fecha] as const,
  historial: (inscripcionId: string) => [...asistenciasKeys.all, 'historial', inscripcionId] as const,
}

// ---------- Lecturas ----------

// Lo cargado de una clase (una comisión en una fecha). Con esto la planilla sabe si la clase ya se cargó.
export function useAsistenciaDeClase(comisionId: string, fecha: string) {
  return useQuery({
    queryKey: asistenciasKeys.clase(comisionId, fecha),
    queryFn: () => asistenciasApi.deClase(comisionId, fecha),
  })
}

// Historial de varias inscripciones en paralelo, para el detalle del socio (su historial en cada comisión).
export function useHistoriales(inscripcionIds: string[] | undefined) {
  return useQueries({
    queries: (inscripcionIds ?? []).map((id) => ({
      queryKey: asistenciasKeys.historial(id),
      queryFn: () => asistenciasApi.historial(id),
    })),
    combine: (resultados) => ({
      porInscripcion: Object.fromEntries((inscripcionIds ?? []).map((id, i) => [id, resultados[i]?.data])) as Record<string, Asistencia[] | undefined>,
      isPending: !inscripcionIds || resultados.some((r) => r.isPending),
      error: resultados.find((r) => r.error && !r.data)?.error ?? null,
      refetch: () => Promise.all(resultados.map((r) => r.refetch())),
    }),
  })
}

// ---------- Escrituras ----------

// Toda la clase en un solo request y una transacción en el back: se guarda todo o nada.
// Se invalida también si el back la rechaza (400): lo más probable es que alguien cargó parte de la clase
// mientras se marcaba (o dio de baja una inscripción), y la planilla tiene que mostrar cómo quedó.
// Sin conexión no se vuelve a pedir nada: solo demoraría el mensaje de error.
// Se devuelve la Promise para que mutateAsync termine con la planilla ya actualizada.
export function useGuardarClase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AsistenciaClaseRequest) => asistenciasApi.registrarClase(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: asistenciasKeys.all }),
    onError: (e, body) =>
      e instanceof ApiError && e.status === 400 &&
      Promise.all([
        qc.invalidateQueries({ queryKey: asistenciasKeys.all }),
        qc.invalidateQueries({ queryKey: inscripcionesKeys.porComision(body.comisionId) }),
      ]),
  })
}

export function useCorregirAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ asistenciaId, presente }: { asistenciaId: string; presente: boolean }) => asistenciasApi.corregir(asistenciaId, { presente }),
    onSuccess: () => qc.invalidateQueries({ queryKey: asistenciasKeys.all }),
  })
}
