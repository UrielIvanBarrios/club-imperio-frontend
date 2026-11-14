import type { RouteObject } from 'react-router'
import { ActividadDetailPage } from './pages/ActividadDetailPage'
import { ActividadFormPage } from './pages/ActividadFormPage'
import { ActividadesListPage } from './pages/ActividadesListPage'

export const actividadesRoutes: RouteObject = {
  path: 'actividades',
  children: [
    { index: true, element: <ActividadesListPage /> }, //  /actividades
    { path: 'nueva', element: <ActividadFormPage /> }, //  /actividades/nueva
    { path: ':id', element: <ActividadDetailPage /> }, //  /actividades/:id
    { path: ':id/editar', element: <ActividadFormPage /> }, //  /actividades/:id/editar
  ],
}
