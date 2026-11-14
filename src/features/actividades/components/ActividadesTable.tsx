import EditIcon from '@mui/icons-material/Edit'
import BajaIcon from '@mui/icons-material/DoNotDisturbOn'
import { IconButton, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip } from '@mui/material'
import { useNavigate } from 'react-router'
import { formatPrecio } from '../../../lib/format'
import { paginar } from '../../../lib/paginar'
import type { Actividad } from '../types'
import { ChipEstadoActividad } from './ChipEstadoActividad'
import { COLUMNAS } from './columnas'

// La descripción se oculta en pantallas chicas para que la tabla entre
const soloDesktop = { display: { xs: 'none', md: 'table-cell' } }

interface Props {
  actividades: Actividad[] // ya filtradas y ordenadas: la tabla solo pagina y dibuja
  pagina: number
  porPagina: number
  onPagina: (pagina: number) => void
  onPorPagina: (porPagina: number) => void
  onBaja: (actividad: Actividad) => void
}

export function ActividadesTable({ actividades, pagina: paginaPedida, porPagina, onPagina, onPorPagina, onBaja }: Props) {
  const navigate = useNavigate()
  const { pagina, visibles } = paginar(actividades, paginaPedida, porPagina)

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNAS.map((c) => (
              <TableCell
                key={c}
                sx={c === 'Descripción' ? soloDesktop : undefined}
                align={c === 'Acciones' || c === 'Precio mensual' ? 'right' : 'left'}
              >
                {c}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((a) => (
            <TableRow key={a.actividadId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/actividades/${a.actividadId}`)}>
              <TableCell>{a.nombre}</TableCell>
              <TableCell sx={{ ...soloDesktop, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.descripcion ?? '—'}
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatPrecio(a.precioMensual)}</TableCell>
              <TableCell><ChipEstadoActividad activo={a.activo} /></TableCell>
              {/* stopPropagation: el click en un botón no tiene que abrir también el detalle */}
              <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Editar">
                  <IconButton size="small" aria-label={`Editar ${a.nombre}`} onClick={() => navigate(`/actividades/${a.actividadId}/editar`)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={a.activo ? 'Dar de baja' : 'Ya está dada de baja'}>
                  <span>
                    <IconButton size="small" aria-label={`Dar de baja ${a.nombre}`} disabled={!a.activo} onClick={() => onBaja(a)}>
                      <BajaIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={actividades.length}
        page={pagina}
        rowsPerPage={porPagina}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, p) => onPagina(p)}
        onRowsPerPageChange={(e) => onPorPagina(Number(e.target.value))}
      />
    </>
  )
}
