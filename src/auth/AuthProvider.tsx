import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '../api/client'
import type { LoginResponse, Usuario } from '../api/types'
import { AuthContext } from './AuthContext'
import { clearSession, loadSession, saveSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState(() => loadSession()?.usuario ?? null)
  const [sesionVencida, setSesionVencida] = useState(false)

  // Cuando el cliente HTTP recibe un 401, vaciamos el usuario: las rutas protegidas
  // dejan de dejar pasar y redirigen solas al login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUsuario(null)
      setSesionVencida(true)
      queryClient.clear()
    })
  }, [queryClient])

  const iniciarSesion = useCallback((r: LoginResponse) => {
    saveSession({ token: r.token, expiraEn: r.expiraEn, usuario: r.usuario })
    setUsuario(r.usuario)
    setSesionVencida(false)
  }, [])

  const cerrarSesion = useCallback(() => {
    clearSession()
    setUsuario(null)
    setSesionVencida(false)
    // Que el próximo usuario no vea datos cacheados del anterior.
    queryClient.clear()
  }, [queryClient])

  // El token no cambia (sigue firmado con los datos del login): solo se actualiza lo que muestra el front.
  const actualizarUsuario = useCallback((nuevo: Usuario) => {
    const sesion = loadSession()
    if (!sesion || sesion.usuario.usuarioId !== nuevo.usuarioId) return
    saveSession({ ...sesion, usuario: nuevo })
    setUsuario(nuevo)
  }, [])

  const value = useMemo(
    () => ({ usuario, sesionVencida, iniciarSesion, cerrarSesion, actualizarUsuario }),
    [usuario, sesionVencida, iniciarSesion, cerrarSesion, actualizarUsuario],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
