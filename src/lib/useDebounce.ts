import { useEffect, useState } from 'react'

// Devuelve `valor` recién cuando dejó de cambiar durante `ms`.
// Para búsquedas que van al back: mientras se tipea "perez" no sale una request por cada letra.
export function useDebounce<T>(valor: T, ms = 300): T {
  const [demorado, setDemorado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setDemorado(valor), ms)
    return () => clearTimeout(t) // si cambió antes de tiempo, se descarta el anterior
  }, [valor, ms])
  return demorado
}
