import { useMutation, useQueryClient } from '@tanstack/react-query'
import { guardarArchivo } from '../../lib/descargar'
import { personasKeys } from '../personas/hooks'
import { importacionApi } from './api'

// Capa 2. Las dos llamadas son mutaciones (POST / descarga a pedido), no consultas que se cachean.

// Se usa dos veces en la pantalla: una para simular y otra para importar de verdad.
export function useImportarSocios() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ archivo, simular }: { archivo: File; simular: boolean }) => importacionApi.importar(archivo, simular),
    onSuccess: (reporte) => {
      // Solo la importación real cambia datos: el listado de Personas tiene que volver a pedirse
      if (!reporte.simulacion && reporte.importadas > 0) qc.invalidateQueries({ queryKey: personasKeys.all })
    },
  })
}

export function useDescargarPlantilla() {
  return useMutation({
    mutationFn: importacionApi.descargarPlantilla,
    onSuccess: (blob) => guardarArchivo(blob, 'plantilla-socios.csv'),
  })
}
