import type { RouteObject } from 'react-router'
import { InscribirPage } from './pages/InscribirPage'
import { InscripcionesListPage } from './pages/InscripcionesListPage'

// Sin detalle propio: cada fila del listado lleva al socio o a la comisión, donde ya se ve la inscripción.
export const inscripcionesRoutes: RouteObject = {
  path: 'inscripciones',
  children: [
    { index: true, element: <InscripcionesListPage /> }, //  /inscripciones (con filtros en la URL)
    { path: 'nueva', element: <InscribirPage /> }, //  /inscripciones/nueva?persona=<id> o ?comision=<id>
  ],
}
