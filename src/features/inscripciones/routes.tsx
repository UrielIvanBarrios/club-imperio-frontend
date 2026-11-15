import type { RouteObject } from 'react-router'
import { InscribirPage } from './pages/InscribirPage'

// El back no tiene "listar todas las inscripciones": se ven desde el socio o desde la comisión.
// Esta ruta es el alta: /inscripciones?persona=<id> o ?comision=<id> para llegar con el dato precargado.
export const inscripcionesRoutes: RouteObject = {
  path: 'inscripciones',
  element: <InscribirPage />,
}
