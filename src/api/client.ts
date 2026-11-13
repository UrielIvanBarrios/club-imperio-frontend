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

// Quién se entera cuando el back responde 401: lo registra el AuthProvider.
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  // false solo para el login: no manda token y un 401 no cierra la sesión.
  auth?: boolean
}

export async function api<T>(path: string, { body, auth = true, headers, ...init }: RequestOptions = {}): Promise<T> {
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
      onUnauthorized()
    }
    throw new ApiError(response.status, message)
  }

  // 204 No Content (DELETE, PATCH): no hay cuerpo que parsear.
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
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
