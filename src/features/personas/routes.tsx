import type { RouteObject } from 'react-router'
import { PersonaDetailPage } from './pages/PersonaDetailPage'
import { PersonaFormPage } from './pages/PersonaFormPage'
import { PersonasListPage } from './pages/PersonasListPage'

// Cada módulo exporta sus rutas y App.tsx las monta dentro del layout.
export const personasRoutes: RouteObject = {
  path: 'personas',
  children: [
    { index: true, element: <PersonasListPage /> }, //  /personas
    { path: 'nueva', element: <PersonaFormPage /> }, //  /personas/nueva
    { path: ':id', element: <PersonaDetailPage /> }, //  /personas/:id
    { path: ':id/editar', element: <PersonaFormPage /> }, //  /personas/:id/editar
  ],
}
