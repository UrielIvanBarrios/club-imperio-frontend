import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

// Estado de un listado (filtros, búsqueda, página) guardado en la URL: ?estado=todos&pagina=1.
// Al volver con "atrás" el listado queda como estaba, y el link se puede compartir.
export function useParamsUrl() {
  const [params, setParams] = useSearchParams()

  // cambiar({ estado: 'todos' }) agrega/reemplaza; cambiar({ q: null }) lo saca.
  // Cambiar un filtro vuelve a la página 1, salvo que el cambio sea la página misma.
  const cambiar = useCallback(
    (cambios: Record<string, string | null>) => {
      const nuevos = new URLSearchParams(params)
      for (const [k, v] of Object.entries(cambios)) {
        if (v === null || v === '') nuevos.delete(k)
        else nuevos.set(k, v)
      }
      if (!('pagina' in cambios)) nuevos.delete('pagina')
      setParams(nuevos, { replace: true })
    },
    [params, setParams],
  )

  const limpiar = useCallback(() => setParams({}, { replace: true }), [setParams])

  return { params, cambiar, limpiar }
}
