import { Alert, Box, MenuItem, Paper, Skeleton, TextField, Typography } from '@mui/material'
import { useMemo } from 'react'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { formatFecha, hoyISO } from '../../../lib/format'
import { useParamsUrl } from '../../../lib/useParamsUrl'
import { useActividades } from '../../actividades/hooks'
import { useComisionesPorActividad } from '../../comisiones/hooks'
import { PlanillaAsistencia } from '../components/PlanillaAsistencia'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

// /asistencia?actividad=<id>&comision=<id>&fecha=aaaa-mm-dd
// La elección queda en la URL: desde el detalle de una comisión se llega con todo elegido,
// y al volver con "atrás" la planilla sigue en la misma clase. Sin fecha, es hoy.
export function TomarAsistenciaPage() {
  const { params, cambiar } = useParamsUrl()
  const actividadId = params.get('actividad') ?? ''
  const comisionId = params.get('comision') ?? ''
  const hoy = hoyISO()
  const fecha = params.get('fecha') ?? hoy

  const actividades = useActividades()
  const comisiones = useComisionesPorActividad(actividadId || undefined)
  const activas = useMemo(
    () => (actividades.data ?? []).filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [actividades.data],
  )
  const actividadValida = activas.some((a) => a.actividadId === actividadId)
  const listaComisiones = actividadValida ? (comisiones.data ?? []) : []
  const comision = listaComisiones.find((c) => c.comisionId === comisionId)
  // Si falla un refresco pero ya había lista, se sigue con esa
  const errorComisiones = comisiones.isError && !comisiones.data ? comisiones.error : null

  // Comparar como texto alcanza: "aaaa-mm-dd" ordena igual que la fecha.
  // El back también rechaza una fecha futura; se frena antes para no mostrar una planilla que no se puede guardar.
  const errorFecha = !FECHA.test(fecha) ? 'Elegí la fecha de la clase' : fecha > hoy ? 'No se puede tomar asistencia de una fecha futura' : null

  if (actividades.isError && !actividades.data) {
    return (
      <>
        <PageHeader titulo="Tomar asistencia" />
        <ErrorState error={actividades.error} onRetry={() => actividades.refetch()} />
      </>
    )
  }

  return (
    <>
      <PageHeader titulo="Tomar asistencia" />

      <Paper sx={{ p: 2, mb: 2 }}>
        {actividades.isPending ? (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr' } }} aria-busy="true">
            {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={56} />)}
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr' }, alignItems: 'start' }}>
            <TextField
              select
              name="actividad"
              label="Actividad"
              value={actividadValida ? actividadId : ''}
              // Otra actividad, otras comisiones: la elegida deja de valer
              onChange={(e) => cambiar({ actividad: e.target.value, comision: null })}
              helperText={activas.length === 0 ? 'No hay actividades activas' : undefined}
            >
              {activas.map((a) => <MenuItem key={a.actividadId} value={a.actividadId}>{a.nombre}</MenuItem>)}
            </TextField>
            <TextField
              select
              name="comision"
              label="Comisión"
              value={comision ? comisionId : ''}
              onChange={(e) => cambiar({ comision: e.target.value })}
              disabled={!actividadValida || comisiones.isPending || listaComisiones.length === 0}
              helperText={
                !actividadValida ? 'Primero elegí la actividad'
                  : comisiones.isPending ? 'Cargando comisiones...'
                    : errorComisiones ? `No se pudieron cargar las comisiones: ${errorComisiones.message}`
                      : listaComisiones.length === 0 ? 'Esta actividad no tiene comisiones activas'
                        : undefined
              }
              error={!!errorComisiones}
            >
              {listaComisiones.map((c) => <MenuItem key={c.comisionId} value={c.comisionId}>{c.nombre} · {c.horario}</MenuItem>)}
            </TextField>
            <TextField
              type="date"
              name="fecha"
              label="Fecha de la clase"
              value={fecha}
              onChange={(e) => cambiar({ fecha: e.target.value || null })}
              error={!!errorFecha}
              helperText={errorFecha ?? (fecha === hoy ? 'Hoy' : undefined)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy } }}
            />
          </Box>
        )}
      </Paper>

      {comisionId && actividadValida && !comisiones.isPending && !comision && !errorComisiones ? (
        // Link viejo o comisión dada de baja después: no se ofrece (el back no acepta asistencias de una comisión dada de baja)
        <Alert severity="warning">La comisión del link no existe o está dada de baja: elegí otra.</Alert>
      ) : !comision ? (
        <Paper>
          <EmptyState titulo="Elegí la comisión y la fecha de la clase" descripcion="Vas a ver a los inscriptos activos para marcar quién vino." />
        </Paper>
      ) : errorFecha ? null : (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" component="h2">
            {comision.actividad.nombre} · {comision.nombre}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {comision.horario} · Clase del {formatFecha(fecha)}
          </Typography>
          <PlanillaAsistencia key={`${comision.comisionId}|${fecha}`} comision={comision} fecha={fecha} />
        </Paper>
      )}
    </>
  )
}
