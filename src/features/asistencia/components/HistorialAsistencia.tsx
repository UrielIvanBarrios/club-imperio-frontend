import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useState } from 'react'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { contar, formatFecha } from '../../../lib/format'
import { useInscripcionesPorSocio } from '../../inscripciones/hooks'
import { useHistoriales } from '../hooks'
import { ChipAsistencia } from './ChipAsistencia'

const COLUMNAS = ['Fecha', 'Actividad · Comisión', 'Asistencia']
const PRIMERAS = 10

// Historial de asistencia del socio, para el detalle de la persona.
// El back da el historial por inscripción y solo lista las inscripciones activas del socio:
// lo de comisiones de las que se dio de baja no se puede mostrar.
export function HistorialAsistencia({ dni }: { dni: string }) {
  const inscripciones = useInscripcionesPorSocio(dni) // misma caché que la sección "Inscripciones activas"
  const historiales = useHistoriales(inscripciones.data?.map((i) => i.inscripcionId))
  const [verTodo, setVerTodo] = useState(false)

  if (inscripciones.isError && !inscripciones.data) {
    return <ErrorState error={inscripciones.error} titulo="No se pudo cargar la asistencia" onRetry={() => inscripciones.refetch()} />
  }
  if (historiales.error) return <ErrorState error={historiales.error} titulo="No se pudo cargar la asistencia" onRetry={() => historiales.refetch()} />
  if (inscripciones.isPending || historiales.isPending) return <TableSkeleton columnas={COLUMNAS} filas={2} />
  if (inscripciones.data.length === 0) return <EmptyState titulo="Sin asistencia para mostrar" descripcion="La asistencia se ve por cada inscripción activa." />

  const registros = inscripciones.data
    .flatMap((i) => (historiales.porInscripcion[i.inscripcionId] ?? []).map((a) => ({ ...a, comision: i.comision })))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
  if (registros.length === 0) return <EmptyState titulo="Todavía no tiene asistencias cargadas" />
  const visibles = verTodo ? registros : registros.slice(0, PRIMERAS)

  return (
    <>
      {/* Resumen por comisión: "Fútbol · Turno Tarde: 3 de 4 clases (75 %)" */}
      <Box component="ul" sx={{ m: 0, mb: 2, pl: 2.5 }}>
        {inscripciones.data.map((i) => {
          const h = historiales.porInscripcion[i.inscripcionId] ?? []
          const presentes = h.filter((a) => a.presente).length
          return (
            <Typography component="li" key={i.inscripcionId}>
              <strong>{i.comision.actividad.nombre} · {i.comision.nombre}</strong>:{' '}
              {h.length === 0 ? 'sin clases cargadas' : `${presentes} de ${contar(h.length, 'clase')} (${Math.round((presentes / h.length) * 100)} %)`}
            </Typography>
          )
        })}
      </Box>

      <Table size="small" aria-label="Historial de asistencia">
        <TableHead>
          <TableRow>
            {COLUMNAS.map((c) => <TableCell key={c}>{c}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((a) => (
            <TableRow key={a.asistenciaId}>
              <TableCell>{formatFecha(a.fecha)}</TableCell>
              <TableCell>{a.comision.actividad.nombre} · {a.comision.nombre}</TableCell>
              <TableCell><ChipAsistencia presente={a.presente} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {registros.length > PRIMERAS && (
        <Button sx={{ mt: 1 }} onClick={() => setVerTodo((v) => !v)}>
          {verTodo ? `Ver las últimas ${PRIMERAS}` : `Ver todas (${registros.length})`}
        </Button>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Solo de las inscripciones activas.
      </Typography>
    </>
  )
}
