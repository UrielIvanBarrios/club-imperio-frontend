import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Radio, RadioGroup, TextField, Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { useToast } from '../../../components/toast/ToastContext'
import { formatFechaHora } from '../../../lib/format'
import { useMarcarAsistenciaClase } from '../hooks'
import { lugarParaNota, SEPARADOR_NOTA } from '../schema'
import type { ClasePrueba } from '../types'
import { Notas } from './Notas'

interface Props {
  clase: ClasePrueba | null // null = cerrado
  onClose: () => void
}

// Marcar si vino, con una nota opcional.
// Si hay nota, el back reemplaza las observaciones con lo que se le mande: se manda lo que ya había más la nota
// nueva, así no se pierde el historial. Sin nota no se mandan, y quedan como estaban.
export function MarcarAsistenciaDialog({ clase, onClose }: Props) {
  return (
    <Dialog open={!!clase} onClose={onClose} maxWidth="sm" fullWidth>
      {/* key: cada vez que se abre para otra clase, el formulario arranca de cero */}
      {clase && <Formulario key={clase.clasePruebaId} clase={clase} onClose={onClose} />}
    </Dialog>
  )
}

function Formulario({ clase, onClose }: { clase: ClasePrueba; onClose: () => void }) {
  const toast = useToast()
  const marcar = useMarcarAsistenciaClase()
  // Arranca en "Asistió": si estaba pendiente, es lo más común; si ya asistió, es lo que hay
  const [asistio, setAsistio] = useState(true)
  const [nota, setNota] = useState('')
  const lugar = lugarParaNota(clase)
  const quien = `${clase.persona.nombre} ${clase.persona.apellido}`
  const notaLimpia = nota.trim()
  const errorNota = notaLimpia.length > lugar ? `Te pasaste por ${notaLimpia.length - lugar} caracteres` : null
  const sinCambios = asistio === clase.asistio && !notaLimpia

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (errorNota || sinCambios) return
    const observaciones = notaLimpia ? (clase.observaciones ? `${clase.observaciones}${SEPARADOR_NOTA}${notaLimpia}` : notaLimpia) : undefined
    try {
      await marcar.mutateAsync({ id: clase.clasePruebaId, asistio, observaciones })
      toast.exito(asistio ? `Se marcó que ${quien} asistió a la clase de prueba de ${clase.actividad.nombre}` : `La clase de prueba de ${quien} quedó pendiente`)
      onClose()
    } catch {
      // El error queda en marcar.error y se muestra arriba
    }
  }

  return (
    <Box component="form" noValidate onSubmit={enviar}>
      <DialogTitle>Marcar asistencia</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Clase de prueba de <strong>{clase.actividad.nombre}</strong> de <strong>{quien}</strong> (DNI {clase.persona.dni}), el {formatFechaHora(clase.fechaSolicitada)}.
        </DialogContentText>
        {marcar.error && <Alert severity="error" sx={{ mb: 2 }}>{marcar.error.message}</Alert>}

        <RadioGroup name="asistio" value={asistio ? 'si' : 'no'} onChange={(e) => setAsistio(e.target.value === 'si')}>
          <FormControlLabel value="si" control={<Radio />} label="Asistió" />
          <FormControlLabel value="no" control={<Radio />} label="Pendiente: todavía no vino" />
        </RadioGroup>
        {!asistio && (
          // El back no tiene "no vino": mientras esté pendiente, no se le puede registrar otra de esta actividad
          <Alert severity="info" sx={{ mt: 1 }}>
            Mientras siga pendiente, no se le puede registrar otra clase de prueba de {clase.actividad.nombre}.
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Observaciones</Typography>
        <Notas clase={clase} vacio="Todavía no tiene observaciones." />
        <TextField
          name="nota"
          label="Agregar una nota (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          sx={{ mt: 2 }}
          disabled={lugar <= 0}
          error={!!errorNota}
          helperText={lugar <= 0 ? 'Ya no entran más observaciones (máximo 500 caracteres en total)' : (errorNota ?? `Quedan ${lugar - notaLimpia.length} caracteres`)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={marcar.isPending}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={marcar.isPending || sinCambios || !!errorNota}>
          {marcar.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Box>
  )
}
