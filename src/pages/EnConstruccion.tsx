import { Paper, Typography } from '@mui/material'

// Placeholder para las pantallas que todavía no están hechas.
export function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        {titulo}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Pantalla en construcción.</Typography>
      </Paper>
    </>
  )
}
