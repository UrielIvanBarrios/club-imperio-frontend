import type { RouteObject } from 'react-router'
import { DashboardPage } from './pages/DashboardPage'

// La pantalla de inicio: "/"
export const dashboardRoutes: RouteObject = { index: true, element: <DashboardPage /> }
