import { Chip } from '@mui/material'

export function ChipAsistencia({ presente }: { presente: boolean }) {
  return <Chip size="small" variant="outlined" label={presente ? 'Presente' : 'Ausente'} color={presente ? 'success' : 'error'} />
}
