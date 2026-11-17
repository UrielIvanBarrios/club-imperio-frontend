import AssignmentIcon from '@mui/icons-material/Assignment'
import EditIcon from '@mui/icons-material/Edit'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import RestoreIcon from '@mui/icons-material/Restore'
import {
  Alert, Box, Button, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../../api/client'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { useToast } from '../../../components/toast/ToastContext'
import { esUuid, formatFecha } from '../../../lib/format'
import { HistorialAsistencia } from '../../asistencia/components/HistorialAsistencia'
import { useInscripcionesPorSocio } from '../../inscripciones/hooks'
import { BajaPersonaDialog } from '../components/BajaPersonaDialog'
import { ChipEstado, ChipSocio } from '../components/PersonaChips'
import { useActualizarPersona, usePersona } from '../hooks'
import type { Persona } from '../types'

export function PersonaDetailPage() {
  const { id } = useParams()
  const valido = esUuid(id)
  const persona = usePersona(valido ? id : undefined)
  const volver = <Button color="inherit" size="small" component={Link} to="/personas">Volver al listado</Button>

  // Un UUID mal formado haría que el back responda con un error técnico de Java: lo cortamos antes.
  if (!valido) return <ErrorState titulo="No existe la persona" error={new Error('El link no es válido.')} accion={volver} />
  if (persona.isPending) return <DetalleSkeleton />
  if (persona.isError) {
    // 400 acá es "no existe": reintentar no cambia nada, así que se ofrece volver.
    const noExiste = persona.error instanceof ApiError && persona.error.status === 400
    return <ErrorState error={persona.error} onRetry={noExiste ? undefined : () => persona.refetch()} accion={noExiste ? volver : undefined} />
  }
  return <Detalle persona={persona.data} />
}

function Detalle({ persona: p }: { persona: Persona }) {
  const toast = useToast()
  const [bajaAbierta, setBajaAbierta] = useState(false)
  const reactivar = useActualizarPersona()

  return (
    <>
      <PageHeader
        titulo={`${p.nombre} ${p.apellido}`}
        migas={[{ label: 'Personas', to: '/personas' }, { label: `${p.apellido}, ${p.nombre}` }]}
        acciones={
          <>
            {/* Solo una persona activa se puede inscribir o pedir una clase de prueba (el back también lo valida) */}
            {p.activo && (
              <Button variant="contained" startIcon={<HowToRegIcon />} component={Link} to={`/inscripciones/nueva?persona=${p.personaId}`}>
                Inscribir
              </Button>
            )}
            {p.activo && (
              <Button variant="outlined" startIcon={<AssignmentIcon />} component={Link} to={`/clases-prueba/nueva?persona=${p.personaId}`}>
                Clase de prueba
              </Button>
            )}
            <Button variant="outlined" startIcon={<EditIcon />} component={Link} to={`/personas/${p.personaId}/editar`}>
              Editar
            </Button>
            {p.activo ? (
              <Button variant="outlined" color="error" startIcon={<PersonOffIcon />} onClick={() => setBajaAbierta(true)}>
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
                    { id: p.personaId, data: { activo: true } },
                    { onSuccess: () => toast.exito(`Se reactivó a ${p.nombre} ${p.apellido}`), onError: (e) => toast.error(e.message) },
                  )
                }
              >
                {reactivar.isPending ? 'Reactivando...' : 'Reactivar'}
              </Button>
            )}
          </>
        }
      />

      {!p.activo && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta persona está dada de baja: no se la puede inscribir en comisiones.
        </Alert>
      )}

      <Stack spacing={2}>
        <Seccion titulo="Datos personales" extra={<Stack direction="row" spacing={1}><ChipSocio persona={p} /><ChipEstado persona={p} /></Stack>}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
            <Dato label="DNI" valor={p.dni} />
            <Dato label="Fecha de nacimiento" valor={formatFecha(p.fechaNacimiento)} />
            <Dato label="Email" valor={p.email ?? '—'} />
            <Dato label="Teléfono" valor={p.telefonoPrincipal ?? '—'} />
            <Dato label="Alta en el sistema" valor={formatFecha(p.fechaCreacion)} />
          </Box>
        </Seccion>

        <Seccion titulo="Membresías">
          {p.membresias.length === 0 ? (
            <Typography color="text.secondary">Nunca fue socio del club.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Alta</TableCell>
                  <TableCell>Baja</TableCell>
                  <TableCell>Motivo de baja</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...p.membresias].sort((a, b) => b.fechaAlta.localeCompare(a.fechaAlta)).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatFecha(m.fechaAlta)}</TableCell>
                    <TableCell>{m.fechaBaja ? formatFecha(m.fechaBaja) : 'Vigente'}</TableCell>
                    <TableCell>{m.motivoBaja ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Seccion>

        <Seccion titulo="Inscripciones activas">
          <Inscripciones dni={p.dni} />
        </Seccion>

        <Seccion titulo="Asistencia">
          <HistorialAsistencia dni={p.dni} />
        </Seccion>
      </Stack>

      <BajaPersonaDialog persona={bajaAbierta ? p : null} onClose={() => setBajaAbierta(false)} />
    </>
  )
}

// Cada sección del detalle carga por su cuenta: si fallan las inscripciones, los datos personales se siguen viendo.
function Inscripciones({ dni }: { dni: string }) {
  const navigate = useNavigate()
  const q = useInscripcionesPorSocio(dni)
  const columnas = ['Actividad', 'Comisión', 'Horario', 'Desde']

  if (q.isPending) return <TableSkeleton columnas={columnas} filas={2} />
  if (q.isError) return <ErrorState error={q.error} titulo="No se pudieron cargar las inscripciones" onRetry={() => q.refetch()} />
  if (q.data.length === 0) return <EmptyState titulo="No tiene inscripciones activas" />
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columnas.map((c) => <TableCell key={c}>{c}</TableCell>)}
        </TableRow>
      </TableHead>
      <TableBody>
        {q.data.map((i) => (
          <TableRow key={i.inscripcionId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/comisiones/${i.comision.comisionId}`)}>
            <TableCell>{i.comision.actividad.nombre}</TableCell>
            <TableCell>{i.comision.nombre}</TableCell>
            <TableCell>{i.comision.horario}</TableCell>
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
        {[140, 100, 100].map((h, i) => <Skeleton key={i} variant="rounded" height={h} />)}
      </Stack>
    </Box>
  )
}
