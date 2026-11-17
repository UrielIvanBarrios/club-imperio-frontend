import HowToRegIcon from '@mui/icons-material/HowToReg'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, InputAdornment, LinearProgress, MenuItem, Paper, TextField } from '@mui/material'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { useDebounce } from '../../../lib/useDebounce'
import { useParamsUrl } from '../../../lib/useParamsUrl'
import { useActividades } from '../../actividades/hooks'
import { useComisionesPorActividad } from '../../comisiones/hooks'
import { COLUMNAS } from '../components/columnas'
import { InscripcionesTable } from '../components/InscripcionesTable'
import { useInscripciones } from '../hooks'
import type { EstadoInscripcion } from '../types'

const ESTADOS: EstadoInscripcion[] = ['activas', 'bajas', 'todas']

// /inscripciones?actividad=<id>&comision=<id>&q=perez&estado=todas&pagina=1
// A diferencia de otros listados, acá los filtros los aplica el back (GET /api/inscripciones):
// con todas las inscripciones históricas del club, traer todo y filtrar en memoria no escala.
export function InscripcionesListPage() {
  const { params, cambiar, limpiar } = useParamsUrl()
  const actividadId = params.get('actividad') ?? ''
  const comisionId = params.get('comision') ?? ''
  const q = params.get('q') ?? ''
  // Un estado inventado a mano en la URL se toma como el de por defecto (el back respondería 400)
  const estado = ESTADOS.find((e) => e === params.get('estado')) ?? 'activas'
  const pagina = Number(params.get('pagina') ?? 0)
  const [porPagina, setPorPagina] = useState(10)

  // La caja de búsqueda tiene su propio estado: lo tipeado se ve al instante, y a la URL (y por lo tanto
  // al back) llega recién cuando se deja de tipear 300 ms. Así "perez" es una sola request, no cinco.
  const [texto, setTexto] = useState(q)
  const textoDemorado = useDebounce(texto, 300)
  const escribirEnUrl = useEffectEvent((valor: string) => {
    if (valor !== q) cambiar({ q: valor })
  })
  useEffect(() => escribirEnUrl(textoDemorado), [textoDemorado])
  // Y al revés: si la URL cambia por otro lado ("Limpiar filtros", "atrás"), la caja se pone al día.
  // (Si el cambio es el que acaba de escribir la búsqueda, no: se pisaría lo que se siguió tipeando.)
  const [qPrevio, setQPrevio] = useState(q)
  if (q !== qPrevio) {
    setQPrevio(q)
    if (q !== textoDemorado) setTexto(q)
  }

  const query = useInscripciones({
    actividadId: actividadId || undefined,
    comisionId: comisionId || undefined,
    q: q.trim() || undefined,
    estado: estado === 'activas' ? undefined : estado, // activas es el default del back
  })

  const actividades = useActividades()
  const actividadesOrdenadas = useMemo(
    () => [...(actividades.data ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es')),
    [actividades.data],
  )
  // El select de comisión depende de la actividad. Incluye las dadas de baja: sus inscripciones también se pueden buscar.
  const comisiones = useComisionesPorActividad(actividadId || undefined, { incluirInactivas: true })
  const comisionesOrdenadas = useMemo(
    () => [...(comisiones.data ?? [])].sort((a, b) => Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre, 'es')),
    [comisiones.data],
  )
  const comisionElegida = comisiones.data?.find((c) => c.comisionId === comisionId)

  const hayFiltros = !!actividadId || !!comisionId || !!q || estado !== 'activas'
  const inscripciones = query.data ?? []

  return (
    <>
      <PageHeader
        titulo="Inscripciones"
        acciones={
          <Button variant="contained" startIcon={<HowToRegIcon />} component={Link} to="/inscripciones/nueva">
            Inscribir socio
          </Button>
        }
      />

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          name="q"
          label="Buscar por DNI o nombre"
          size="small"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          sx={{ flex: '1 1 240px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <TextField select name="actividad" label="Actividad" size="small"
          value={actividadesOrdenadas.some((a) => a.actividadId === actividadId) ? actividadId : ''}
          // Al cambiar de actividad, la comisión elegida ya no corresponde
          onChange={(e) => cambiar({ actividad: e.target.value, comision: null })} sx={{ minWidth: 200 }}
          disabled={!actividades.data} error={actividades.isError} helperText={actividades.isError ? 'No se pudieron cargar' : undefined}>
          <MenuItem value="">Todas las actividades</MenuItem>
          {actividadesOrdenadas.map((a) => (
            <MenuItem key={a.actividadId} value={a.actividadId}>{a.nombre}{a.activo ? '' : ' (inactiva)'}</MenuItem>
          ))}
        </TextField>
        <TextField select name="comision" label="Comisión" size="small"
          // Mientras no estén las opciones, vacío (MUI avisa si el valor no está entre ellas)
          value={comisionElegida ? comisionId : ''}
          onChange={(e) => cambiar({ comision: e.target.value })} sx={{ minWidth: 220 }}
          disabled={!actividadId || !comisiones.data}
          error={comisiones.isError} helperText={comisiones.isError ? 'No se pudieron cargar' : undefined}>
          <MenuItem value="">Todas las comisiones</MenuItem>
          {comisionesOrdenadas.map((c) => (
            <MenuItem key={c.comisionId} value={c.comisionId}>{c.nombre} · {c.horario}{c.activa ? '' : ' (dada de baja)'}</MenuItem>
          ))}
        </TextField>
        <TextField select name="estado" label="Estado" size="small" value={estado}
          onChange={(e) => cambiar({ estado: e.target.value === 'activas' ? null : e.target.value })} sx={{ minWidth: 140 }}>
          <MenuItem value="activas">Activas</MenuItem>
          <MenuItem value="bajas">Dadas de baja</MenuItem>
          <MenuItem value="todas">Todas</MenuItem>
        </TextField>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {/* Barra fina mientras se tipea o llega el resultado de un filtro nuevo: se sigue viendo el anterior */}
        {((query.isFetching && !query.isPending) || texto !== q) && <LinearProgress />}

        {query.isPending ? (
          <TableSkeleton columnas={COLUMNAS} />
        ) : query.isError ? (
          <Box sx={{ p: 2 }}>
            {/* Un 400 del back (ej: link con una comisión de otra actividad) no se arregla reintentando: se ofrece limpiar */}
            <ErrorState
              error={query.error}
              titulo="No se pudieron cargar las inscripciones"
              accion={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* Si el back estaba caído, también fallaron las opciones de los filtros: se piden de nuevo */}
                  <Button color="inherit" size="small" onClick={() => {
                    query.refetch()
                    if (actividades.isError) actividades.refetch()
                    if (comisiones.isError) comisiones.refetch()
                  }}>Reintentar</Button>
                  {hayFiltros && <Button color="inherit" size="small" onClick={limpiar}>Limpiar filtros</Button>}
                </Box>
              }
            />
          </Box>
        ) : inscripciones.length === 0 ? (
          hayFiltros ? (
            <EmptyState titulo="No hay inscripciones que coincidan" accion={<Button onClick={limpiar}>Limpiar filtros</Button>} />
          ) : (
            <EmptyState
              titulo="Todavía no hay inscripciones activas"
              descripcion="Una inscripción anota a un socio en una comisión de una actividad."
              accion={
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button variant="contained" startIcon={<HowToRegIcon />} component={Link} to="/inscripciones/nueva">Inscribir socio</Button>
                  <Button onClick={() => cambiar({ estado: 'todas' })}>Ver también las bajas</Button>
                </Box>
              }
            />
          )
        ) : (
          <InscripcionesTable
            inscripciones={inscripciones}
            pagina={pagina}
            porPagina={porPagina}
            onPagina={(p) => cambiar({ pagina: p === 0 ? null : String(p) })}
            onPorPagina={(n) => {
              setPorPagina(n)
              cambiar({ pagina: null })
            }}
          />
        )}
      </Paper>
    </>
  )
}
