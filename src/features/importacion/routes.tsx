import type { RouteObject } from 'react-router'
import { ImportarSociosPage } from './pages/ImportarSociosPage'

// Se monta dentro de <ProtectedRoute rol="ADMIN" /> (App.tsx). El back igual responde 403 a un USER.
export const importacionRoutes: RouteObject = { path: 'importar', element: <ImportarSociosPage /> }
