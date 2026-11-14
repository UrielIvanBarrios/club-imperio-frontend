import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '../../api/client'

// El back devuelve los errores de negocio como un texto suelto, sin decir de qué campo son.
// Con estas reglas se ubica el mensaje debajo del campo que corresponde; si ninguna coincide,
// se muestra arriba del formulario (errors.root.server).
// Ej: aplicarErrorDelBack(e, setError, [[/dni/i, 'dni']])
export function aplicarErrorDelBack<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  campos: [RegExp, Path<T>][],
) {
  const mensaje = error instanceof Error ? error.message : 'Error inesperado'
  const campo = error instanceof ApiError && error.status === 400 ? campos.find(([regla]) => regla.test(mensaje))?.[1] : undefined
  if (campo) setError(campo, { message: mensaje }, { shouldFocus: true })
  else setError('root.server', { message: mensaje })
}
