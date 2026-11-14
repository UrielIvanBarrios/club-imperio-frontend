import { Box, LinearProgress, Typography } from '@mui/material'

interface Props {
  inscriptos: number
  cupoMaximo: number | null // null = sin tope
}

// "8 / 12 ocupados" con barra. Naranja desde el 80 % y rojo cuando está completa
// (el back rechaza nuevas inscripciones con el cupo lleno).
export function CupoOcupado({ inscriptos, cupoMaximo }: Props) {
  if (cupoMaximo === null) {
    return <Typography>{inscriptos} {inscriptos === 1 ? 'inscripto' : 'inscriptos'} (sin tope de cupo)</Typography>
  }
  const porcentaje = Math.min(100, (inscriptos / cupoMaximo) * 100)
  const completa = inscriptos >= cupoMaximo
  const libres = Math.max(0, cupoMaximo - inscriptos)
  return (
    <Box>
      <Typography>
        <strong>{inscriptos} / {cupoMaximo}</strong> ocupados · {completa ? 'Completa' : `${libres} ${libres === 1 ? 'lugar libre' : 'lugares libres'}`}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={porcentaje}
        color={completa ? 'error' : porcentaje >= 80 ? 'warning' : 'primary'}
        sx={{ mt: 1, height: 8, borderRadius: 4, maxWidth: 360 }}
        aria-label={`Cupo ocupado: ${inscriptos} de ${cupoMaximo}`}
      />
    </Box>
  )
}
