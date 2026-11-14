import type { RouteObject } from 'react-router'
import { UsuarioFormPage } from './pages/UsuarioFormPage'
import { UsuariosListPage } from './pages/UsuariosListPage'

// Se monta dentro de <ProtectedRoute rol="ADMIN" /> (App.tsx). El back igual responde 403 a un USER.
export const usuariosRoutes: RouteObject = {
  path: 'usuarios',
  children: [
    { index: true, element: <UsuariosListPage /> }, //  /usuarios
    { path: 'nuevo', element: <UsuarioFormPage /> }, //  /usuarios/nuevo
    { path: ':id/editar', element: <UsuarioFormPage /> }, //  /usuarios/:id/editar
  ],
}
