import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { clasesPruebaApi } from './api'

// Capa 2: hooks de TanStack Query. Las pantallas usan esto, nunca clasesPruebaApi directo.

export const clasesPruebaKeys = {
  all: ['clases-prueba'] as const,
  list: () => [...clasesPruebaKeys.all, 'list'] as const,
}

// ---------- Lecturas ----------

// La lista completa: la usan el listado, el alta (para saber qué pendientes tiene cada persona) y el dashboard
export function useClasesPrueba() {
  return useQuery({ queryKey: clasesPruebaKeys.list(), queryFn: clasesPruebaApi.listar })
}

// ---------- Escrituras ----------
// Los PATCH devuelven 204 sin cuerpo: se invalida y la lista vuelve con lo guardado.
// Se devuelve la Promise para que mutateAsync termine con la lista ya actualizada.

// Si el back rechazó (400), la lista que hay en pantalla puede estar vieja: se vuelve a pedir.
// Sin conexión no tiene sentido: solo demoraría el mensaje de error.
const rechazoDelBack = (e: Error) => e instanceof ApiError && e.status === 400

export function useRegistrarClasePrueba() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: clasesPruebaApi.registrar,
    onSuccess: () => qc.invalidateQueries({ queryKey: clasesPruebaKeys.all }),
    // El rechazo más probable es una pendiente que se cargó desde otra pantalla
    onError: (e) => rechazoDelBack(e) && qc.invalidateQueries({ queryKey: clasesPruebaKeys.all }),
  })
}

export function useMarcarAsistenciaClase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, asistio, observaciones }: { id: string; asistio: boolean; observaciones?: string }) =>
      clasesPruebaApi.marcarAsistencia(id, asistio, observaciones),
    onSuccess: () => qc.invalidateQueries({ queryKey: clasesPruebaKeys.all }),
    onError: (e) => rechazoDelBack(e) && qc.invalidateQueries({ queryKey: clasesPruebaKeys.all }),
  })
}

export function useAgregarObservacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nota }: { id: string; nota: string }) => clasesPruebaApi.agregarObservacion(id, nota),
    onSuccess: () => qc.invalidateQueries({ queryKey: clasesPruebaKeys.all }),
    onError: (e) => rechazoDelBack(e) && qc.invalidateQueries({ queryKey: clasesPruebaKeys.all }),
  })
}
