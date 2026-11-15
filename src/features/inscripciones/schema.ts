import { z } from 'zod'

// El formulario elige ids; al back se le manda el DNI de la persona elegida (POST ?dni=&comisionId=).
// La actividad no viaja: sirve para acotar las comisiones del select.
export const inscripcionSchema = z.object({
  personaId: z.string().min(1, 'Elegí el socio'),
  actividadId: z.string().min(1, 'Elegí la actividad'),
  comisionId: z.string().min(1, 'Elegí la comisión'),
})

export type InscripcionFormValues = z.infer<typeof inscripcionSchema>

export const valoresVacios: InscripcionFormValues = { personaId: '', actividadId: '', comisionId: '' }
