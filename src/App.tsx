import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { actividadesRoutes } from './features/actividades/routes'
import { asistenciaRoutes } from './features/asistencia/routes'
import { clasesPruebaRoutes } from './features/clases-prueba/routes'
import { comisionesRoutes } from './features/comisiones/routes'
import { dashboardRoutes } from './features/dashboard/routes'
import { importacionRoutes } from './features/importacion/routes'
import { inscripcionesRoutes } from './features/inscripciones/routes'
import { PerfilPage } from './features/perfil/pages/PerfilPage'
import { personasRoutes } from './features/personas/routes'
import { usuariosRoutes } from './features/usuarios/routes'
import { LoginPage } from './pages/LoginPage'

// Árbol de rutas:
//   /login                 → pública
//   ProtectedRoute         → exige estar logueado
//     AppLayout            → menú lateral + barra superior
//       /                  → dashboard
//       /personas/*, /actividades/*, /comisiones/*, /inscripciones/*, /asistencia, /clases-prueba/* → features/<módulo>/routes.tsx
//       /perfil            → el usuario logueado (ADMIN o USER)
//       ProtectedRoute ADMIN → /usuarios/*, /importar (features/<módulo>/routes.tsx)
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          dashboardRoutes,
          personasRoutes,
          actividadesRoutes,
          comisionesRoutes,
          inscripcionesRoutes,
          asistenciaRoutes,
          clasesPruebaRoutes,
          { path: 'perfil', element: <PerfilPage /> }, // cualquier usuario logueado (no está en el menú: se entra desde la barra)
          { element: <ProtectedRoute rol="ADMIN" />, children: [usuariosRoutes, importacionRoutes] },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
