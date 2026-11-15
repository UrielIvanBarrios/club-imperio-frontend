import { clearSession, getToken } from '../auth/session'
import type { ErrorBody } from './types'

const API_URL = import.meta.env.VITE_API_URL

// Error con el status HTTP y el mensaje que manda el back, para mostrarlo en pantalla.
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Quién se entera cuando el back responde 401 o 403: lo registra el AuthProvider.
// 401 = la sesión ya no sirve (token vencido o inválido, o usuario desactivado): se pasa el
// mensaje del back para que el login explique por qué.
// 403 = la sesión sirve pero el rol no alcanza: el back usa el rol actual de la base, y puede
// ser distinto del que quedó guardado en el front (ej: a un ADMIN lo bajaron a USER).
let onUnauthorized: (mensaje: string) => void = () => {}
export function setUnauthorizedHandler(handler: (mensaje: string) => void) {
  onUnauthorized = handler
}
let onForbidden: () => void = () => {}
export function setForbiddenHandler(handler: () => void) {
  onForbidden = handler
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  // false solo para el login: no manda token y un 401 no cierra la sesión.
  auth?: boolean
  // 'blob' para descargas (ej: la plantilla de importación). Los errores igual vienen en JSON.
  respuesta?: 'json' | 'blob'
}

export async function api<T>(path: string, { body, auth = true, respuesta = 'json', headers, ...init }: RequestOptions = {}): Promise<T> {
  const finalHeaders = new Headers(headers)
  const isFormData = body instanceof FormData
  if (body !== undefined && !isFormData) finalHeaders.set('Content-Type', 'application/json')

  const token = auth ? getToken() : null
  if (token) finalHeaders.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
  } catch {
    // fetch solo falla así si no hubo respuesta: back caído, sin red o CORS.
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verificá que el back esté levantado.')
  }

  if (!response.ok) {
    const message = await readErrorMessage(response)
    if (response.status === 401 && auth) {
      clearSession()
      onUnauthorized(message)
    }
    if (response.status === 403 && auth) onForbidden()
    throw new ApiError(response.status, message)
  }

  // 204 No Content (DELETE, PATCH): no hay cuerpo que parsear.
  if (response.status === 204) return undefined as T
  if (respuesta === 'blob') return (await response.blob()) as T
  try {
    return (await response.json()) as T
  } catch {
    // 2xx con un cuerpo que no es JSON válido (ej: el back cortó la respuesta a la mitad).
    // Sin esto se vería el error técnico del parser.
    throw new ApiError(response.status, 'La respuesta del servidor no se pudo leer. Recargá la pantalla para ver cómo quedaron los datos.')
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as Partial<ErrorBody>
    if (data.message) return data.message
  } catch {
    // El cuerpo no era JSON: usamos el mensaje genérico.
  }
  if (response.status === 403) return 'No tenés permisos para realizar esta acción.'
  if (response.status === 413) return 'El archivo es demasiado grande.'
  return `Error inesperado del servidor (${response.status}).`
}
