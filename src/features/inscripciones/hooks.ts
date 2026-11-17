import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { comisionesKeys } from '../comisiones/hooks'
import { personasKeys } from '../personas/hooks'
import { inscripcionesApi } from './api'
import type { InscripcionFiltros } from './types'

// Todas empiezan con 'inscripciones': invalidar ['inscripciones'] refresca el listado,
// las del socio y las de la comisión de una sola vez.
export const inscripcionesKeys = {
  all: ['inscripciones'] as const,
  listado: (filtros: InscripcionFiltros) => [...inscripcionesKeys.all, 'listado', filtros] as const,
  porSocio: (dni: string) => [...inscripcionesKeys.all, 'socio', dni] as const,
  porComision: (comisionId: string) => [...inscripcionesKeys.all, 'comision', comisionId] as const,
}

// La tabla de /inscripciones. Los filtros van al back (no se filtra en memoria): cada combinación
// es una consulta con su propia clave de caché. keepPreviousData: mientras llega el resultado
// de un filtro nuevo se sigue viendo el anterior (con la barra de "cargando"), sin volver al skeleton.
export function useInscripciones(filtros: InscripcionFiltros) {
  return useQuery({
    queryKey: inscripcionesKeys.listado(filtros),
    queryFn: () => inscripcionesApi.listar(filtros),
    placeholderData: keepPreviousData,
  })
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

// Cupo libre de varias comisiones a la vez (el select del alta). La comisión no trae cuántos
// inscriptos tiene, así que se pide la lista de cada una en paralelo y se cuentan.
// Mismas claves que useInscripcionesPorComision: lo que ya se vio sale de la caché.
export function useInscriptosDeComisiones(comisionIds: string[]) {
  return useQueries({
    queries: comisionIds.map((id) => ({
      queryKey: inscripcionesKeys.porComision(id),
      queryFn: () => inscripcionesApi.listarActivasPorComision(id),
    })),
    combine: (resultados) => ({
      // comisionId → cantidad de inscriptos activos (undefined mientras carga o si falló)
      cantidad: Object.fromEntries(comisionIds.map((id, i) => [id, resultados[i]?.data?.length])) as Record<string, number | undefined>,
      error: resultados.find((r) => r.error)?.error ?? null,
    }),
  })
}

export function useInscribir() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: inscripcionesApi.inscribir,
    onSuccess: () => qc.invalidateQueries({ queryKey: inscripcionesKeys.all }),
    // Si el back lo rechazó, es porque algo cambió desde que se cargó la pantalla (otro llenó el cupo,
    // dieron de baja a la persona o la comisión): se vuelve a pedir todo, así las opciones quedan al día.
    onError: () => Promise.all([
      qc.invalidateQueries({ queryKey: inscripcionesKeys.all }),
      qc.invalidateQueries({ queryKey: personasKeys.all }),
      qc.invalidateQueries({ queryKey: comisionesKeys.all }),
    ]),
  })
}
