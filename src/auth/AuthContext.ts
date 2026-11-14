import { createContext, useContext } from 'react'
import type { LoginResponse, Usuario } from '../api/types'

export interface AuthState {
  usuario: Usuario | null
  // Si la sesión se cerró porque el back respondió 401, su mensaje: "Sesión inválida o vencida…"
  // o "Tu usuario fue desactivado…". null si se cerró a mano o nunca se abrió.
  motivoCierre: string | null
  iniciarSesion: (respuesta: LoginResponse) => void
  cerrarSesion: () => void
  // Cuando el usuario logueado edita sus propios datos: refresca la sesión guardada (mismo token)
  actualizarUsuario: (usuario: Usuario) => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth se usa dentro de <AuthProvider>')
  return ctx
}
