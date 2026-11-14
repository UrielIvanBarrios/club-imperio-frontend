import type { RouteObject } from 'react-router'
import { ComisionDetailPage } from './pages/ComisionDetailPage'
import { ComisionFormPage } from './pages/ComisionFormPage'
import { ComisionesListPage } from './pages/ComisionesListPage'

export const comisionesRoutes: RouteObject = {
  path: 'comisiones',
  children: [
    { index: true, element: <ComisionesListPage /> }, //  /comisiones?actividad=<id>
    { path: 'nueva', element: <ComisionFormPage /> }, //  /comisiones/nueva?actividad=<id>
    { path: ':id', element: <ComisionDetailPage /> }, //  /comisiones/:id
    { path: ':id/editar', element: <ComisionFormPage /> }, //  /comisiones/:id/editar
  ],
}
