import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import {
  AppBar, Box, Button, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { MENU } from './menu'

const DRAWER_WIDTH = 240

export function AppLayout() {
  const { usuario, cerrarSesion } = useAuth()
  const theme = useTheme()
  const esDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()

  const items = MENU.filter((item) => !item.rol || item.rol === usuario?.rol)
  const estaActivo = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path))

  const menu = (
    <>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Club Imperio
        </Typography>
      </Toolbar>
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            selected={estaActivo(item.path)}
            onClick={() => setAbierto(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}>
        <Toolbar>
          {!esDesktop && (
            <IconButton color="inherit" edge="start" onClick={() => setAbierto(true)} sx={{ mr: 1 }} aria-label="Abrir menú">
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Mi perfil">
            <Button color="inherit" component={NavLink} to="/perfil" startIcon={<AccountCircleIcon />} sx={{ mr: 1, textTransform: 'none' }}>
              {usuario?.nombre} · {usuario?.rol}
            </Button>
          </Tooltip>
          <Tooltip title="Cerrar sesión">
            <IconButton color="inherit" onClick={cerrarSesion} aria-label="Cerrar sesión">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* En desktop el menú queda fijo; en pantallas chicas se abre con el botón hamburguesa. */}
      <Drawer
        variant={esDesktop ? 'permanent' : 'temporary'}
        open={esDesktop || abierto}
        onClose={() => setAbierto(false)}
        sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
      >
        {menu}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
        <Toolbar />
        {/* Acá se dibuja la pantalla de la ruta actual */}
        <Outlet />
      </Box>
    </Box>
  )
}
