import type { RouteObject } from 'react-router'
import { ClasePruebaNuevaPage } from './pages/ClasePruebaNuevaPage'
import { ClasesPruebaListPage } from './pages/ClasesPruebaListPage'

// Sin detalle: el back no tiene GET por id, y todo lo que se hace con una clase (marcar asistencia,
// agregar observación) se hace desde el listado.
export const clasesPruebaRoutes: RouteObject = {
  path: 'clases-prueba',
  children: [
    { index: true, element: <ClasesPruebaListPage /> }, //  /clases-prueba
    { path: 'nueva', element: <ClasePruebaNuevaPage /> }, //  /clases-prueba/nueva
  ],
}
