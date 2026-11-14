import EditIcon from '@mui/icons-material/Edit'
import BajaIcon from '@mui/icons-material/DoNotDisturbOn'
import {
  Alert, Box, Button, Link as MuiLink, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../../api/client'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { esUuid, formatFecha } from '../../../lib/format'
import { useInscripcionesPorComision } from '../../inscripciones/hooks'
import { BajaComisionDialog } from '../components/BajaComisionDialog'
import { ChipEstadoComision } from '../components/ChipEstadoComision'
import { CupoOcupado } from '../components/CupoOcupado'
import { useComision } from '../hooks'
import type { Comision } from '../types'

export function ComisionDetailPage() {
  const { id } = useParams()
  const valido = esUuid(id)
  const comision = useComision(valido ? id : undefined)
  const volver = <Button color="inherit" size="small" component={Link} to="/comisiones">Volver al listado</Button>

  // Un UUID mal formado haría que el back responda con un error técnico de Java: lo cortamos antes.
  if (!valido) return <ErrorState titulo="No existe la comisión" error={new Error('El link no es válido.')} accion={volver} />
  if (comision.isPending) return <DetalleSkeleton />
  if (comision.isError) {
    // 400 acá es "no existe": reintentar no cambia nada, así que se ofrece volver.
    const noExiste = comision.error instanceof ApiError && comision.error.status === 400
    return <ErrorState error={comision.error} onRetry={noExiste ? undefined : () => comision.refetch()} accion={noExiste ? volver : undefined} />
  }
  return <Detalle comision={comision.data} />
}

function Detalle({ comision: c }: { comision: Comision }) {
  const [bajaAbierta, setBajaAbierta] = useState(false)
  const inscripciones = useInscripcionesPorComision(c.comisionId)

  return (
    <>
      <PageHeader
        titulo={c.nombre}
        migas={[{ label: 'Comisiones', to: '/comisiones' }, { label: `${c.actividad.nombre} · ${c.nombre}` }]}
        acciones={
          c.activa && (
            <>
              <Button variant="outlined" startIcon={<EditIcon />} component={Link} to={`/comisiones/${c.comisionId}/editar`}>
                Editar
              </Button>
              <Button variant="outlined" color="error" startIcon={<BajaIcon />} onClick={() => setBajaAbierta(true)}>
                Dar de baja
              </Button>
            </>
          )
        }
      />

      {!c.activa && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta comisión está dada de baja: no acepta inscripciones ni asistencias, y no se puede editar ni reactivar.
        </Alert>
      )}

      <Stack spacing={2}>
        <Seccion titulo="Datos" extra={<ChipEstadoComision activa={c.activa} />}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 2fr' } }}>
            <Dato label="Actividad">
              <MuiLink component={Link} to={`/actividades/${c.actividad.actividadId}`}>{c.actividad.nombre}</MuiLink>
            </Dato>
            <Dato label="Horario">{c.horario}</Dato>
            <Dato label="Cupo">
              {inscripciones.isPending ? <Skeleton width={200} /> : inscripciones.isError ? (c.cupoMaximo ?? 'Sin tope') : (
                <CupoOcupado inscriptos={inscripciones.data.length} cupoMaximo={c.cupoMaximo} />
              )}
            </Dato>
          </Box>
        </Seccion>

        <Seccion titulo="Inscriptos activos">
          <Inscriptos query={inscripciones} activa={c.activa} />
        </Seccion>
      </Stack>

      <BajaComisionDialog comision={bajaAbierta ? c : null} onClose={() => setBajaAbierta(false)} />
    </>
  )
}

// Los inscriptos cargan por su cuenta: si fallan, los datos de la comisión se siguen viendo.
function Inscriptos({ query: q, activa }: { query: ReturnType<typeof useInscripcionesPorComision>; activa: boolean }) {
  const navigate = useNavigate()
  const columnas = ['DNI', 'Apellido y nombre', 'Inscripto desde']

  if (q.isPending) return <TableSkeleton columnas={columnas} filas={3} />
  if (q.isError) return <ErrorState error={q.error} titulo="No se pudieron cargar los inscriptos" onRetry={() => q.refetch()} />
  if (q.data.length === 0) {
    return <EmptyState titulo={activa ? 'Todavía no hay inscriptos' : 'No tiene inscriptos activos'} descripcion={activa ? undefined : 'Al dar de baja la comisión se dieron de baja sus inscripciones.'} />
  }

  const ordenadas = [...q.data].sort((a, b) => a.persona.apellido.localeCompare(b.persona.apellido, 'es') || a.persona.nombre.localeCompare(b.persona.nombre, 'es'))
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columnas.map((c) => <TableCell key={c}>{c}</TableCell>)}
        </TableRow>
      </TableHead>
      <TableBody>
        {ordenadas.map((i) => (
          <TableRow key={i.inscripcionId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/personas/${i.persona.personaId}`)}>
            <TableCell>{i.persona.dni}</TableCell>
            <TableCell>{i.persona.apellido}, {i.persona.nombre}</TableCell>
            <TableCell>{formatFecha(i.fechaInscripcion)}</TableCell>
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

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Box>{children}</Box>
    </Box>
  )
}

function DetalleSkeleton() {
  return (
    <Box aria-busy="true">
      <Skeleton width={160} />
      <Skeleton variant="text" width={300} height={56} sx={{ mb: 2 }} />
      <Stack spacing={2}>
        {[110, 160].map((h, i) => <Skeleton key={i} variant="rounded" height={h} />)}
      </Stack>
    </Box>
  )
}
