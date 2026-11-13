import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { MENU } from './layout/menu'
import { EnConstruccion } from './pages/EnConstruccion'
import { LoginPage } from './pages/LoginPage'

const conRol = (rol?: 'ADMIN') => MENU.filter((item) => item.rol === rol)
const toRoute = (item: (typeof MENU)[number]) =>
  item.path === '/'
    ? { index: true, element: <EnConstruccion titulo={item.label} /> }
    : { path: item.path.slice(1), element: <EnConstruccion titulo={item.label} /> }

// Árbol de rutas:
//   /login                 → pública
//   ProtectedRoute         → exige estar logueado
//     AppLayout            → menú lateral + barra superior
//       /, /personas, ...  → pantallas
//       ProtectedRoute ADMIN → /importar, /usuarios
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          ...conRol(undefined).map(toRoute),
          { element: <ProtectedRoute rol="ADMIN" />, children: conRol('ADMIN').map(toRoute) },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
