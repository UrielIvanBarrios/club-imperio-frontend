import AssignmentIcon from '@mui/icons-material/Assignment'
import DashboardIcon from '@mui/icons-material/Dashboard'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import GroupsIcon from '@mui/icons-material/Groups'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import PeopleIcon from '@mui/icons-material/People'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import type { ReactNode } from 'react'
import type { Rol } from '../api/types'

export interface MenuItem {
  label: string
  path: string
  icon: ReactNode
  rol?: Rol // si está, solo se muestra a ese rol
}

// Una sola lista para el menú lateral y para las rutas: si se agrega una pantalla, se toca acá.
export const MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Personas', path: '/personas', icon: <PeopleIcon /> },
  { label: 'Actividades', path: '/actividades', icon: <SportsSoccerIcon /> },
  { label: 'Comisiones', path: '/comisiones', icon: <GroupsIcon /> },
  { label: 'Inscripciones', path: '/inscripciones', icon: <HowToRegIcon /> },
  { label: 'Asistencia', path: '/asistencia', icon: <EventAvailableIcon /> },
  { label: 'Clases de prueba', path: '/clases-prueba', icon: <AssignmentIcon /> },
  { label: 'Importar socios', path: '/importar', icon: <UploadFileIcon />, rol: 'ADMIN' },
  { label: 'Usuarios', path: '/usuarios', icon: <ManageAccountsIcon />, rol: 'ADMIN' },
]
