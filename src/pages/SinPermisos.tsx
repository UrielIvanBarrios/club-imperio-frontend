import { Alert, Button } from '@mui/material'
import { Link } from 'react-router'

export function SinPermisos() {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" component={Link} to="/">
          Volver al inicio
        </Button>
      }
    >
      No tenés permisos para ver esta pantalla.
    </Alert>
  )
}
