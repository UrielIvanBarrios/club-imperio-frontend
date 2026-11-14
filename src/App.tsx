import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { MENU } from './layout/menu'
import { actividadesRoutes } from './features/actividades/routes'
import { comisionesRoutes } from './features/comisiones/routes'
import { PerfilPage } from './features/perfil/pages/PerfilPage'
import { personasRoutes } from './features/personas/routes'
import { usuariosRoutes } from './features/usuarios/routes'
import { EnConstruccion } from './pages/EnConstruccion'
import { LoginPage } from './pages/LoginPage'

// Pantallas ya implementadas: tienen sus propias rutas. El resto del menú muestra "en construcción".
const IMPLEMENTADAS = ['/personas', '/actividades', '/comisiones', '/usuarios']
const conRol = (rol?: 'ADMIN') => MENU.filter((item) => item.rol === rol && !IMPLEMENTADAS.includes(item.path))
const toRoute = (item: (typeof MENU)[number]) =>
  item.path === '/'
    ? { index: true, element: <EnConstruccion titulo={item.label} /> }
    : { path: item.path.slice(1), element: <EnConstruccion titulo={item.label} /> }

// Árbol de rutas:
//   /login                 → pública
//   ProtectedRoute         → exige estar logueado
//     AppLayout            → menú lateral + barra superior
//       /personas/*, /actividades/*, /comisiones/* → features/<módulo>/routes.tsx
//       /perfil            → el usuario logueado (ADMIN o USER)
//       /, /inscripciones... → pantallas (por ahora "en construcción")
//       ProtectedRoute ADMIN → /usuarios/* (features/usuarios/routes.tsx), /importar
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          personasRoutes,
          actividadesRoutes,
          comisionesRoutes,
          { path: 'perfil', element: <PerfilPage /> }, // cualquier usuario logueado (no está en el menú: se entra desde la barra)
          ...conRol(undefined).map(toRoute),
          { element: <ProtectedRoute rol="ADMIN" />, children: [usuariosRoutes, ...conRol('ADMIN').map(toRoute)] },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
