import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, InputAdornment, LinearProgress, MenuItem, Paper, TextField } from '@mui/material'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { normalizarTexto } from '../../../lib/paginar'
import { useParamsUrl } from '../../../lib/useParamsUrl'
import { useActividades } from '../../actividades/hooks'
import { BajaComisionDialog } from '../components/BajaComisionDialog'
import { COLUMNAS } from '../components/columnas'
import { ComisionesTable } from '../components/ComisionesTable'
import { useComisionesDeActividades } from '../hooks'
import type { Comision } from '../types'

type Estado = 'activas' | 'inactivas' | 'todas'

export function ComisionesListPage() {
  // Actividad, búsqueda, estado y página en la URL (?actividad=<id>&q=tarde&estado=todas&pagina=1)
  const { params, cambiar, limpiar } = useParamsUrl()
  const actividadId = params.get('actividad') ?? ''
  const q = params.get('q') ?? ''
  const estado = (params.get('estado') as Estado) || 'activas'
  const pagina = Number(params.get('pagina') ?? 0)
  const [porPagina, setPorPagina] = useState(10)
  const [aDarDeBaja, setADarDeBaja] = useState<Comision | null>(null)

  const actividades = useActividades()
  const ordenadas = useMemo(
    () => [...(actividades.data ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es')),
    [actividades.data],
  )
  // Una actividad elegida → una sola consulta. "Todas" → una por actividad, en paralelo.
  // Con "Activas" alcanza con lo que devuelve el back por defecto; si no, se piden también las dadas de baja.
  const ids = actividades.data && (actividadId ? [actividadId] : actividades.data.map((a) => a.actividadId))
  const comisiones = useComisionesDeActividades(ids, { incluirInactivas: estado !== 'activas' })
  const error = actividades.error ?? comisiones.error

  const filtradas = useMemo(() => {
    const texto = normalizarTexto(q)
    return (comisiones.data ?? [])
      .filter((c) => estado !== 'inactivas' || !c.activa)
      .filter((c) => !texto || normalizarTexto(`${c.nombre} ${c.horario}`).includes(texto))
      .sort((a, b) => a.actividad.nombre.localeCompare(b.actividad.nombre, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
  }, [comisiones.data, q, estado])

  const hayFiltros = !!actividadId || !!q || estado !== 'activas'
  // El alta queda con la actividad del filtro ya elegida
  const linkAlta = actividadId ? `/comisiones/nueva?actividad=${actividadId}` : '/comisiones/nueva'

  return (
    <>
      <PageHeader
        titulo="Comisiones"
        acciones={
          <Button variant="contained" startIcon={<AddIcon />} component={Link} to={linkAlta}>
            Nueva comisión
          </Button>
        }
      />

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField select label="Actividad" size="small" value={actividadId}
          onChange={(e) => cambiar({ actividad: e.target.value })} sx={{ minWidth: 220 }}
          disabled={!actividades.data}>
          <MenuItem value="">Todas las actividades</MenuItem>
          {ordenadas.map((a) => (
            <MenuItem key={a.actividadId} value={a.actividadId}>{a.nombre}{a.activo ? '' : ' (inactiva)'}</MenuItem>
          ))}
        </TextField>
        {/* Filtra mientras se escribe: los datos ya están en memoria, no hay llamada al back */}
        <TextField
          label="Buscar por nombre u horario"
          size="small"
          value={q}
          onChange={(e) => cambiar({ q: e.target.value })}
          sx={{ flex: '1 1 240px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <TextField select label="Estado" size="small" value={estado}
          onChange={(e) => cambiar({ estado: e.target.value === 'activas' ? null : e.target.value })} sx={{ minWidth: 140 }}>
          <MenuItem value="activas">Activas</MenuItem>
          <MenuItem value="inactivas">Inactivas</MenuItem>
          <MenuItem value="todas">Todas</MenuItem>
        </TextField>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {comisiones.isFetching && !comisiones.isPending && <LinearProgress />}

        {error ? (
          <Box sx={{ p: 2 }}>
            <ErrorState error={error} onRetry={() => (actividades.error ? actividades.refetch() : comisiones.refetch())} />
          </Box>
        ) : comisiones.isPending ? (
          <TableSkeleton columnas={COLUMNAS} />
        ) : filtradas.length === 0 ? (
          hayFiltros ? (
            <EmptyState
              titulo="No hay comisiones que coincidan"
              accion={
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button onClick={limpiar}>Limpiar filtros</Button>
                  {actividadId && estado === 'activas' && !q && (
                    <Button variant="contained" startIcon={<AddIcon />} component={Link} to={linkAlta}>Agregar comisión</Button>
                  )}
                </Box>
              }
            />
          ) : (
            <EmptyState
              titulo="Todavía no hay comisiones"
              descripcion="Las comisiones son los turnos de cada actividad (día, horario y cupo)."
              accion={<Button variant="contained" startIcon={<AddIcon />} component={Link} to={linkAlta}>Agregar comisión</Button>}
            />
          )
        ) : (
          <ComisionesTable
            comisiones={filtradas}
            pagina={pagina}
            porPagina={porPagina}
            onPagina={(p) => cambiar({ pagina: p === 0 ? null : String(p) })}
            onPorPagina={(n) => {
              setPorPagina(n)
              cambiar({ pagina: null })
            }}
            onBaja={setADarDeBaja}
          />
        )}
      </Paper>

      <BajaComisionDialog comision={aDarDeBaja} onClose={() => setADarDeBaja(null)} />
    </>
  )
}
