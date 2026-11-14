import DeleteIcon from '@mui/icons-material/PersonOff'
import EditIcon from '@mui/icons-material/Edit'
import {
  IconButton, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip,
} from '@mui/material'
import { useNavigate } from 'react-router'
import type { Persona } from '../types'
import { COLUMNAS } from './columnas'
import { ChipEstado, ChipSocio } from './PersonaChips'

// Email y teléfono se ocultan en pantallas chicas para que la tabla entre
const soloDesktop = { display: { xs: 'none', md: 'table-cell' } }

interface Props {
  personas: Persona[] // ya filtradas y ordenadas: la tabla solo pagina y dibuja
  pagina: number
  porPagina: number
  onPagina: (pagina: number) => void
  onPorPagina: (porPagina: number) => void
  onBaja: (persona: Persona) => void
}

export function PersonasTable({ personas, pagina: paginaPedida, porPagina, onPagina, onPorPagina, onBaja }: Props) {
  const navigate = useNavigate()
  // Si una baja vació la última página, mostramos la anterior en vez de una tabla vacía.
  const pagina = Math.min(paginaPedida, Math.max(0, Math.ceil(personas.length / porPagina) - 1))
  const visibles = personas.slice(pagina * porPagina, pagina * porPagina + porPagina)

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNAS.map((c) => (
              <TableCell key={c} sx={c === 'Email' || c === 'Teléfono' ? soloDesktop : undefined} align={c === 'Acciones' ? 'right' : 'left'}>
                {c}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((p) => (
            <TableRow key={p.personaId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/personas/${p.personaId}`)}>
              <TableCell>{p.dni}</TableCell>
              <TableCell>{p.apellido}, {p.nombre}</TableCell>
              <TableCell sx={soloDesktop}>{p.email ?? '—'}</TableCell>
              <TableCell sx={soloDesktop}>{p.telefonoPrincipal ?? '—'}</TableCell>
              <TableCell><ChipSocio persona={p} /></TableCell>
              <TableCell><ChipEstado persona={p} /></TableCell>
              {/* stopPropagation: el click en un botón no tiene que abrir también el detalle */}
              <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Editar">
                  <IconButton size="small" aria-label={`Editar a ${p.nombre} ${p.apellido}`} onClick={() => navigate(`/personas/${p.personaId}/editar`)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={p.activo ? 'Dar de baja' : 'Ya está dada de baja'}>
                  <span>
                    <IconButton size="small" aria-label={`Dar de baja a ${p.nombre} ${p.apellido}`} disabled={!p.activo} onClick={() => onBaja(p)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* El back devuelve la lista completa (no pagina), así que se pagina acá */}
      <TablePagination
        component="div"
        count={personas.length}
        page={pagina}
        rowsPerPage={porPagina}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, p) => onPagina(p)}
        onRowsPerPageChange={(e) => onPorPagina(Number(e.target.value))}
      />
    </>
  )
}
