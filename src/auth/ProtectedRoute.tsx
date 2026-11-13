import { Navigate, Outlet, useLocation } from 'react-router'
import type { Rol } from '../api/types'
import { SinPermisos } from '../pages/SinPermisos'
import { useAuth } from './AuthContext'

// Envuelve rutas que requieren login. Con `rol`, además exige ese rol (ej: ADMIN).
export function ProtectedRoute({ rol }: { rol?: Rol }) {
  const { usuario } = useAuth()
  const location = useLocation()

  if (!usuario) {
    // Guardamos a dónde quería ir para volver ahí después del login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (rol && usuario.rol !== rol) return <SinPermisos />
  return <Outlet />
}
