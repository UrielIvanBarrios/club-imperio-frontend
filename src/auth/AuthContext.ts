import { createContext, useContext } from 'react'
import type { LoginResponse, Usuario } from '../api/types'

export interface AuthState {
  usuario: Usuario | null
  // true si la sesión se cerró porque el back respondió 401 (token vencido o inválido)
  sesionVencida: boolean
  iniciarSesion: (respuesta: LoginResponse) => void
  cerrarSesion: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth se usa dentro de <AuthProvider>')
  return ctx
}
