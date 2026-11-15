import type { RouteObject } from 'react-router'
import { TomarAsistenciaPage } from './pages/TomarAsistenciaPage'

export const asistenciaRoutes: RouteObject = {
  path: 'asistencia',
  element: <TomarAsistenciaPage />, //  /asistencia?actividad=<id>&comision=<id>&fecha=aaaa-mm-dd
}
