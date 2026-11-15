import { z } from 'zod'
import { hoyISO } from '../../lib/format'
import type { ClasePrueba } from './types'

// La columna observaciones es de 500 caracteres (el back también lo valida y responde 400).
export const MAX_OBSERVACIONES = 500
// Agregar una observación concatena "<anteriores> | Nota: <nota>"
export const SEPARADOR_NOTA = ' | Nota: '

// Las notas de una clase, en el orden en que se agregaron
export const notas = (c: ClasePrueba) => (c.observaciones ? c.observaciones.split(SEPARADOR_NOTA).filter((n) => n.trim()) : [])

// Cuánto lugar le queda a una nota nueva
export const lugarParaNota = (c: ClasePrueba) =>
  MAX_OBSERVACIONES - (c.observaciones ? c.observaciones.length + SEPARADOR_NOTA.length : 0)

// "Pendiente" con la fecha ya pasada: no vino (o nadie lo marcó). Para el back sigue pendiente.
export const vencida = (c: ClasePrueba, ahora = new Date()) => !c.asistio && new Date(c.fechaSolicitada) < ahora

// Alta. El formulario elige ids; al back se le manda el DNI de la persona y la fecha con hora.
// La fecha no puede ser anterior a hoy: es la clase que se pide (el back acepta cualquiera).
export const clasePruebaSchema = z.object({
  personaId: z.string().min(1, 'Elegí la persona'),
  actividadId: z.string().min(1, 'Elegí la actividad'),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí el día de la clase')
    .refine((f) => f >= hoyISO(), 'La clase no puede ser en un día que ya pasó'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Elegí la hora'),
})

export type ClasePruebaFormValues = z.infer<typeof clasePruebaSchema>

export const valoresVacios: ClasePruebaFormValues = { personaId: '', actividadId: '', fecha: '', hora: '' }
