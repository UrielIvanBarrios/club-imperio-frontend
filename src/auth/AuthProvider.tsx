import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, setForbiddenHandler, setUnauthorizedHandler } from '../api/client'
import type { LoginResponse, Usuario } from '../api/types'
import { AuthContext } from './AuthContext'
import { clearSession, loadSession, saveSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState(() => loadSession()?.usuario ?? null)
  const [motivoCierre, setMotivoCierre] = useState<string | null>(null)

  const iniciarSesion = useCallback((r: LoginResponse) => {
    saveSession({ token: r.token, expiraEn: r.expiraEn, usuario: r.usuario })
    setUsuario(r.usuario)
    setMotivoCierre(null)
  }, [])

  const cerrarSesion = useCallback(() => {
    clearSession()
    setUsuario(null)
    setMotivoCierre(null)
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

  // 401: vaciamos el usuario y las rutas protegidas redirigen solas al login. El mensaje del back
  // dice por qué ("Sesión inválida o vencida…" o "Tu usuario fue desactivado…") y el login lo muestra.
  // 403: el back decide con el rol actual de la base. Si a este usuario le cambiaron el rol, el que
  // guardó el front quedó viejo: se vuelve a pedir /me para que el menú y las rutas muestren el real.
  const refrescando = useRef(false)
  useEffect(() => {
    setUnauthorizedHandler((mensaje) => {
      setUsuario(null)
      setMotivoCierre(mensaje)
      queryClient.clear()
    })
    setForbiddenHandler(() => {
      if (refrescando.current) return // varios 403 seguidos → una sola consulta
      refrescando.current = true
      api<Usuario>('/api/auth/me')
        .then(actualizarUsuario)
        .catch(() => {}) // si /me falla con 401, ya lo manejó el handler de arriba
        .finally(() => { refrescando.current = false })
    })
  }, [queryClient, actualizarUsuario])

  const value = useMemo(
    () => ({ usuario, motivoCierre, iniciarSesion, cerrarSesion, actualizarUsuario }),
    [usuario, motivoCierre, iniciarSesion, cerrarSesion, actualizarUsuario],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
