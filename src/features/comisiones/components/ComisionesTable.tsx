import EditIcon from '@mui/icons-material/Edit'
import BajaIcon from '@mui/icons-material/DoNotDisturbOn'
import { IconButton, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip } from '@mui/material'
import { useNavigate } from 'react-router'
import { paginar } from '../../../lib/paginar'
import type { Comision } from '../types'
import { ChipEstadoComision } from './ChipEstadoComision'
import { COLUMNAS } from './columnas'

// El horario se oculta en pantallas chicas para que la tabla entre
const soloDesktop = { display: { xs: 'none', md: 'table-cell' } }

interface Props {
  comisiones: Comision[] // ya filtradas y ordenadas: la tabla solo pagina y dibuja
  pagina: number
  porPagina: number
  onPagina: (pagina: number) => void
  onPorPagina: (porPagina: number) => void
  onBaja: (comision: Comision) => void
}

export function ComisionesTable({ comisiones, pagina: paginaPedida, porPagina, onPagina, onPorPagina, onBaja }: Props) {
  const navigate = useNavigate()
  const { pagina, visibles } = paginar(comisiones, paginaPedida, porPagina)

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNAS.map((c) => (
              <TableCell key={c} sx={c === 'Horario' ? soloDesktop : undefined} align={c === 'Acciones' || c === 'Cupo' ? 'right' : 'left'}>
                {c}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((c) => (
            <TableRow key={c.comisionId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/comisiones/${c.comisionId}`)}>
              <TableCell>{c.actividad.nombre}</TableCell>
              <TableCell>{c.nombre}</TableCell>
              <TableCell sx={soloDesktop}>{c.horario}</TableCell>
              <TableCell align="right">{c.cupoMaximo ?? 'Sin tope'}</TableCell>
              <TableCell><ChipEstadoComision activa={c.activa} /></TableCell>
              {/* stopPropagation: el click en un botón no tiene que abrir también el detalle */}
              <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                {/* Una comisión dada de baja no se puede editar ni reactivar (el back no lo permite) */}
                <Tooltip title={c.activa ? 'Editar' : 'Dada de baja: no se puede editar'}>
                  <span>
                    <IconButton size="small" aria-label={`Editar ${c.nombre}`} disabled={!c.activa} onClick={() => navigate(`/comisiones/${c.comisionId}/editar`)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={c.activa ? 'Dar de baja' : 'Ya está dada de baja'}>
                  <span>
                    <IconButton size="small" aria-label={`Dar de baja ${c.nombre}`} disabled={!c.activa} onClick={() => onBaja(c)}>
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
        count={comisiones.length}
        page={pagina}
        rowsPerPage={porPagina}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, p) => onPagina(p)}
        onRowsPerPageChange={(e) => onPorPagina(Number(e.target.value))}
      />
    </>
  )
}
