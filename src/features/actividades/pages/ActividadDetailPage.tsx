import EditIcon from '@mui/icons-material/Edit'
import BajaIcon from '@mui/icons-material/DoNotDisturbOn'
import RestoreIcon from '@mui/icons-material/Restore'
import {
  Alert, Box, Button, Chip, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../../api/client'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { useToast } from '../../../components/toast/ToastContext'
import { esUuid, formatPrecio } from '../../../lib/format'
import { useComisionesPorActividad } from '../../comisiones/hooks'
import { BajaActividadDialog } from '../components/BajaActividadDialog'
import { ChipEstadoActividad } from '../components/ChipEstadoActividad'
import { useActividad, useActualizarActividad } from '../hooks'
import type { Actividad } from '../types'

export function ActividadDetailPage() {
  const { id } = useParams()
  const valido = esUuid(id)
  const actividad = useActividad(valido ? id : undefined)
  const volver = <Button color="inherit" size="small" component={Link} to="/actividades">Volver al listado</Button>

  // Un UUID mal formado haría que el back responda con un error técnico de Java: lo cortamos antes.
  if (!valido) return <ErrorState titulo="No existe la actividad" error={new Error('El link no es válido.')} accion={volver} />
  if (actividad.isPending) return <DetalleSkeleton />
  if (actividad.isError) {
    // 400 acá es "no existe": reintentar no cambia nada, así que se ofrece volver.
    const noExiste = actividad.error instanceof ApiError && actividad.error.status === 400
    return <ErrorState error={actividad.error} onRetry={noExiste ? undefined : () => actividad.refetch()} accion={noExiste ? volver : undefined} />
  }
  return <Detalle actividad={actividad.data} />
}

function Detalle({ actividad: a }: { actividad: Actividad }) {
  const toast = useToast()
  const [bajaAbierta, setBajaAbierta] = useState(false)
  const reactivar = useActualizarActividad()

  return (
    <>
      <PageHeader
        titulo={a.nombre}
        migas={[{ label: 'Actividades', to: '/actividades' }, { label: a.nombre }]}
        acciones={
          <>
            <Button variant="outlined" startIcon={<EditIcon />} component={Link} to={`/actividades/${a.actividadId}/editar`}>
              Editar
            </Button>
            {a.activo ? (
              <Button variant="outlined" color="error" startIcon={<BajaIcon />} onClick={() => setBajaAbierta(true)}>
                Dar de baja
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="success"
                startIcon={<RestoreIcon />}
                disabled={reactivar.isPending}
                onClick={() =>
                  reactivar.mutate(
                    { id: a.actividadId, data: { activo: true } },
                    { onSuccess: () => toast.exito(`Se reactivó la actividad ${a.nombre}`), onError: (e) => toast.error(e.message) },
                  )
                }
              >
                {reactivar.isPending ? 'Reactivando...' : 'Reactivar'}
              </Button>
            )}
          </>
        }
      />

      {!a.activo && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta actividad está dada de baja, y sus comisiones también. Si la reactivás, las comisiones no se reactivan solas.
        </Alert>
      )}

      <Stack spacing={2}>
        <Seccion titulo="Datos" extra={<ChipEstadoActividad activo={a.activo} />}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' } }}>
            <Dato label="Precio mensual" valor={formatPrecio(a.precioMensual)} />
            <Dato label="Descripción" valor={a.descripcion ?? '—'} />
          </Box>
        </Seccion>

        <Seccion titulo="Comisiones">
          <Comisiones actividadId={a.actividadId} />
        </Seccion>
      </Stack>

      <BajaActividadDialog actividad={bajaAbierta ? a : null} onClose={() => setBajaAbierta(false)} />
    </>
  )
}

// Las comisiones cargan por su cuenta: si fallan, los datos de la actividad se siguen viendo.
// Se piden también las dadas de baja, para ver el historial completo de la actividad.
function Comisiones({ actividadId }: { actividadId: string }) {
  const q = useComisionesPorActividad(actividadId, { incluirInactivas: true })
  const columnas = ['Nombre', 'Horario', 'Cupo', 'Estado']

  if (q.isPending) return <TableSkeleton columnas={columnas} filas={2} />
  if (q.isError) return <ErrorState error={q.error} titulo="No se pudieron cargar las comisiones" onRetry={() => q.refetch()} />
  if (q.data.length === 0) return <EmptyState titulo="Todavía no tiene comisiones" descripcion="Las comisiones son los turnos de la actividad (día, horario y cupo)." />

  const ordenadas = [...q.data].sort((x, y) => Number(y.activa) - Number(x.activa) || x.nombre.localeCompare(y.nombre, 'es'))
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columnas.map((c) => <TableCell key={c}>{c}</TableCell>)}
        </TableRow>
      </TableHead>
      <TableBody>
        {ordenadas.map((c) => (
          <TableRow key={c.comisionId} sx={c.activa ? undefined : { opacity: 0.6 }}>
            <TableCell>{c.nombre}</TableCell>
            <TableCell>{c.horario}</TableCell>
            <TableCell>{c.cupoMaximo ?? 'Sin tope'}</TableCell>
            <TableCell>
              {c.activa ? <Chip label="Activa" color="success" size="small" variant="outlined" /> : <Chip label="Inactiva" size="small" />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Seccion({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>{titulo}</Typography>
        {extra}
      </Box>
      {children}
    </Paper>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography>{valor}</Typography>
    </Box>
  )
}

function DetalleSkeleton() {
  return (
    <Box aria-busy="true">
      <Skeleton width={120} />
      <Skeleton variant="text" width={300} height={56} sx={{ mb: 2 }} />
      <Stack spacing={2}>
        {[100, 140].map((h, i) => <Skeleton key={i} variant="rounded" height={h} />)}
      </Stack>
    </Box>
  )
}
