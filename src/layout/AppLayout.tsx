import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import {
  AppBar, Box, Button, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Tooltip, Typography, alpha, useMediaQuery, useTheme,
} from '@mui/material'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useModoColor } from '../components/modo/ModoColorContext'
import { MENU } from './menu'

const DRAWER_WIDTH = 240

export function AppLayout() {
  const { usuario, cerrarSesion } = useAuth()
  const theme = useTheme()
  const { modo, alternar } = useModoColor()
  const marca = theme.palette.marca
  const esDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()

  const items = MENU.filter((item) => !item.rol || item.rol === usuario?.rol)
  const estaActivo = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path))

  const menu = (
    <>
      {/* La marca: monograma dorado y el nombre del club, a la altura de la barra superior */}
      <Toolbar sx={{ gap: 1.5, borderBottom: `1px solid ${alpha(marca.texto, 0.08)}` }}>
        <Box
          aria-hidden
          sx={{
            width: 38, height: 38, borderRadius: 2, flexShrink: 0, display: 'grid', placeItems: 'center',
            bgcolor: marca.acento, color: 'secondary.contrastText', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.04em',
          }}
        >
          CI
        </Box>
        <Box sx={{ minWidth: 0, lineHeight: 1 }}>
          <Typography component="div" noWrap sx={{ fontWeight: 700, fontSize: '1.15rem', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.1 }}>
            Club Imperio
          </Typography>
          <Typography component="div" variant="overline" sx={{ color: marca.acento, lineHeight: 1.4, display: 'block' }}>
            Juniors
          </Typography>
        </Box>
      </Toolbar>
      <List sx={{ px: 1.5, py: 2 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            selected={estaActivo(item.path)}
            onClick={() => setAbierto(false)}
            sx={{
              borderRadius: 2, mb: 0.5, color: marca.textoSuave,
              '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 40 },
              '&:hover': { bgcolor: alpha(marca.texto, 0.06), color: marca.texto },
              // Elegido: fondo dorado tenue, texto pleno y una rayita dorada a la izquierda
              '&.Mui-selected, &.Mui-selected:hover': {
                bgcolor: alpha(marca.acento, 0.16), color: marca.texto,
                boxShadow: `inset 3px 0 0 ${marca.acento}`,
              },
              '&.Mui-selected .MuiListItemIcon-root': { color: marca.acento },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: 500 } } }} />
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
          {/* Sol en modo oscuro (pasar a claro), luna en modo claro (pasar a oscuro) */}
          <Tooltip title={modo === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <IconButton color="inherit" onClick={alternar} aria-label={modo === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} sx={{ mr: 1 }}>
              {modo === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
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
        sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: marca.fondo, color: marca.texto, borderRight: 0 } }}
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
