import { api } from '../../api/client'
import type { ReporteImportacion } from './types'

// Capa 1: una función por endpoint.
export const importacionApi = {
  // multipart/form-data con el campo "archivo". El Content-Type (con su boundary) lo arma el navegador:
  // por eso el cliente HTTP no lo setea cuando el body es un FormData.
  importar(archivo: File, simular: boolean) {
    const form = new FormData()
    form.append('archivo', archivo)
    return api<ReporteImportacion>(`/api/personas/importar?simular=${simular}`, { method: 'POST', body: form })
  },

  // CSV con separador ";" y BOM UTF-8, para que Excel en español lo abra bien
  descargarPlantilla() {
    return api<Blob>('/api/personas/importar/plantilla', { respuesta: 'blob' })
  },
}
