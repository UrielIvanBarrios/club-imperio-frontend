import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { personasApi } from './api'
import type { Persona, PersonaFiltros, PersonaUpdateRequest } from './types'

// Capa 2: hooks de TanStack Query. Las pantallas usan esto, nunca personasApi directo.

// Claves de caché. Todas empiezan con 'personas', así invalidar ['personas']
// refresca listados, detalles y búsquedas de una sola vez.
export const personasKeys = {
  all: ['personas'] as const,
  list: (filtros: PersonaFiltros) => [...personasKeys.all, 'list', filtros] as const,
  porDni: (dni: string) => [...personasKeys.all, 'dni', dni] as const,
  detail: (id: string) => [...personasKeys.all, 'detail', id] as const,
  conteo: (filtros: { activo: boolean; esSocio?: boolean }) => [...personasKeys.all, 'conteo', filtros] as const,
}

// ---------- Lecturas (useQuery) ----------

export function usePersonas(filtros: PersonaFiltros, enabled = true) {
  return useQuery({
    queryKey: personasKeys.list(filtros),
    queryFn: () => personasApi.listar(filtros),
    enabled,
  })
}

export function usePersonaPorDni(dni: string | null) {
  return useQuery({
    queryKey: personasKeys.porDni(dni ?? ''),
    queryFn: () => personasApi.buscarPorDni(dni!),
    enabled: !!dni, // sin DNI cargado no se busca
  })
}

// Para el dashboard: cuántas hay, sin traer la lista
export function useConteoPersonas(filtros: { activo: boolean; esSocio?: boolean }) {
  return useQuery({
    queryKey: personasKeys.conteo(filtros),
    queryFn: () => personasApi.contar(filtros),
    select: (r) => r.total,
  })
}

export function usePersona(id: string | undefined) {
  return useQuery({
    queryKey: personasKeys.detail(id ?? ''),
    queryFn: () => personasApi.obtener(id!),
    enabled: !!id,
  })
}

// ---------- Escrituras (useMutation) ----------
// Después de escribir, se invalida la caché: TanStack Query vuelve a pedir
// los listados que estén en pantalla y descarta los demás. Así nunca se ve un dato viejo.

export function useCrearPersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: personasApi.crear,
    onSuccess: (persona) => {
      qc.invalidateQueries({ queryKey: personasKeys.all })
      // Ya tenemos la persona creada: el detalle se muestra sin volver a pedirla.
      qc.setQueryData(personasKeys.detail(persona.personaId), persona)
    },
  })
}

export function useActualizarPersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PersonaUpdateRequest }) => personasApi.actualizar(id, data),
    onSuccess: (persona) => {
      qc.invalidateQueries({ queryKey: personasKeys.all })
      qc.setQueryData(personasKeys.detail(persona.personaId), persona)
    },
  })
}

export function useDarDeBajaPersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (persona: Persona) => personasApi.darDeBaja(persona.personaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: personasKeys.all }),
  })
}
