import AssignmentIcon from '@mui/icons-material/Assignment'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { Box, Button, Paper, Skeleton, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../../auth/AuthContext'
import { contar, hoyISO } from '../../../lib/format'
import { useActividades } from '../../actividades/hooks'
import { useClasesPrueba } from '../../clases-prueba/hooks'
import { useComisionesDeActividades } from '../../comisiones/hooks'
import { useConteoPersonas } from '../../personas/hooks'

// Inicio: contadores con datos reales del back y atajos a lo que más se usa.
// Cada contador carga y falla por su cuenta: si uno no responde, los demás se ven igual.
export function DashboardPage() {
  const { usuario } = useAuth()
  const socios = useConteoPersonas({ activo: true, esSocio: true })
  const personasActivas = useConteoPersonas({ activo: true })
  const actividades = useActividades()
  const activas = actividades.data?.filter((a) => a.activo)
  // El back no tiene "todas las comisiones" ni un conteo: se pide una lista por actividad activa
  // (las de una actividad dada de baja quedan dadas de baja en cascada)
  const comisiones = useComisionesDeActividades(activas?.map((a) => a.actividadId))
  const clases = useClasesPrueba()
  const pendientes = clases.data?.filter((c) => !c.asistio)
  const hoy = hoyISO()
  const deHoy = pendientes?.filter((c) => c.fechaSolicitada.startsWith(hoy)).length

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Hola{usuario ? `, ${usuario.nombre}` : ''}
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, mb: 3 }}>
        <Contador
          titulo="Socios activos"
          valor={socios.data}
          detalle={personasActivas.data !== undefined ? `de ${contar(personasActivas.data, 'persona')} activas` : undefined}
          cargando={socios.isPending}
          error={socios.isError && socios.data === undefined}
          onRetry={() => Promise.all([socios.refetch(), personasActivas.refetch()])}
          to="/personas?socio=socios"
        />
        <Contador
          titulo="Actividades"
          valor={activas?.length}
          detalle="activas"
          cargando={actividades.isPending}
          error={actividades.isError && !actividades.data}
          onRetry={() => actividades.refetch()}
          to="/actividades"
        />
        <Contador
          titulo="Comisiones"
          valor={comisiones.data?.length}
          detalle="activas"
          // Sin actividades, las comisiones ni se piden: si fallaron las actividades, es error, no "cargando"
          cargando={actividades.isPending || (!!activas && comisiones.isPending)}
          error={(actividades.isError && !actividades.data) || (!!comisiones.error && !comisiones.data)}
          onRetry={() => (actividades.isError ? actividades.refetch() : comisiones.refetch())}
          to="/comisiones"
        />
        <Contador
          titulo="Clases de prueba pendientes"
          valor={pendientes?.length}
          detalle={deHoy !== undefined ? (deHoy === 0 ? 'ninguna para hoy' : `${deHoy} para hoy`) : undefined}
          cargando={clases.isPending}
          error={clases.isError && !clases.data}
          onRetry={() => clases.refetch()}
          to="/clases-prueba"
        />
      </Box>

      <Typography variant="h6" component="h2" gutterBottom>
        Accesos rápidos
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Atajo to="/asistencia" icono={<EventAvailableIcon />}>Tomar asistencia</Atajo>
        <Atajo to="/inscripciones/nueva" icono={<HowToRegIcon />}>Inscribir socio</Atajo>
        <Atajo to="/clases-prueba/nueva" icono={<AssignmentIcon />}>Nueva clase de prueba</Atajo>
        <Atajo to="/personas/nueva" icono={<PersonAddIcon />}>Nueva persona</Atajo>
        {usuario?.rol === 'ADMIN' && <Atajo to="/importar" icono={<UploadFileIcon />}>Importar socios</Atajo>}
      </Box>
    </>
  )
}

interface ContadorProps {
  titulo: string
  valor: number | undefined
  detalle?: string
  cargando: boolean
  error: boolean
  onRetry: () => void
  to: string
}

function Contador({ titulo, valor, detalle, cargando, error, onRetry, to }: ContadorProps) {
  return (
    <Paper component="section" aria-label={titulo} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography color="text.secondary">{titulo}</Typography>
      {cargando ? (
        <Skeleton variant="text" width={80} sx={{ fontSize: '2.5rem' }} />
      ) : error || valor === undefined ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 56 }}>
          <Typography color="error">No se pudo cargar</Typography>
          <Button size="small" onClick={onRetry}>Reintentar</Button>
        </Box>
      ) : (
        <Typography variant="h3" component="p" data-contador>
          {valor}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 20 }}>
        {!cargando && !error && detalle}
      </Typography>
      <Box sx={{ mt: 'auto', pt: 1 }}>
        <Button size="small" component={Link} to={to}>Ver</Button>
      </Box>
    </Paper>
  )
}

function Atajo({ to, icono, children }: { to: string; icono: ReactNode; children: ReactNode }) {
  return (
    <Button variant="outlined" startIcon={icono} component={Link} to={to}>
      {children}
    </Button>
  )
}
