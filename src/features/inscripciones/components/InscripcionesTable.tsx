import { Link as MuiLink, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Typography } from '@mui/material'
import { Link } from 'react-router'
import { formatFecha } from '../../../lib/format'
import { paginar } from '../../../lib/paginar'
import type { InscripcionListado } from '../types'
import { ChipEstadoInscripcion } from './ChipEstadoInscripcion'
import { COLUMNAS } from './columnas'

// Horario y fecha se ocultan en pantallas chicas para que la tabla entre
const soloDesktop = { display: { xs: 'none', md: 'table-cell' } }
const OCULTAS_EN_MOBILE = ['Horario', 'Fecha']

interface Props {
  inscripciones: InscripcionListado[] // ya filtradas y ordenadas por el back: la tabla solo pagina y dibuja
  pagina: number
  porPagina: number
  onPagina: (pagina: number) => void
  onPorPagina: (porPagina: number) => void
}

// Cada fila tiene dos destinos posibles, así que en vez de hacer clickeable la fila entera
// hay un link al socio (su nombre) y otro a la comisión (su nombre).
export function InscripcionesTable({ inscripciones, pagina: paginaPedida, porPagina, onPagina, onPorPagina }: Props) {
  const { pagina, visibles } = paginar(inscripciones, paginaPedida, porPagina)

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNAS.map((c) => (
              <TableCell key={c} sx={OCULTAS_EN_MOBILE.includes(c) ? soloDesktop : undefined}>{c}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((i) => (
            <TableRow key={i.inscripcionId} hover>
              <TableCell>
                <MuiLink component={Link} to={`/personas/${i.persona.personaId}`} underline="hover">
                  {i.persona.apellido}, {i.persona.nombre}
                </MuiLink>
                {/* Se puede inscribir alguien que no es socio (paga solo la actividad): se avisa */}
                {!i.persona.esSocioActivo && <Typography variant="body2" color="text.secondary">No socio</Typography>}
              </TableCell>
              <TableCell>{i.persona.dni}</TableCell>
              <TableCell>{i.actividad.nombre}</TableCell>
              <TableCell>
                <MuiLink component={Link} to={`/comisiones/${i.comision.comisionId}`} underline="hover">{i.comision.nombre}</MuiLink>
              </TableCell>
              <TableCell sx={soloDesktop}>{i.comision.horario}</TableCell>
              <TableCell sx={{ ...soloDesktop, whiteSpace: 'nowrap' }}>{formatFecha(i.fechaInscripcion)}</TableCell>
              <TableCell><ChipEstadoInscripcion activo={i.activo} fechaBaja={i.fechaBaja} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* El back devuelve la lista completa (no pagina), así que se pagina acá */}
      <TablePagination
        component="div"
        count={inscripciones.length}
        page={pagina}
        rowsPerPage={porPagina}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, p) => onPagina(p)}
        onRowsPerPageChange={(e) => onPorPagina(Number(e.target.value))}
      />
    </>
  )
}
