import { z } from 'zod'
import { NO_COINCIDEN, reglaPasswordNueva } from '../usuarios/schema'

// Mismas reglas que AuthService.cambiarPassword: la actual es obligatoria, la nueva cumple la regla
// común (mínimo 8) y tiene que ser distinta de la actual. El back vuelve a validar todo.
export const cambioPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, 'Ingresá tu contraseña actual'),
    passwordNueva: reglaPasswordNueva,
    confirmar: z.string(),
  })
  .refine((v) => !v.passwordNueva || v.passwordNueva !== v.passwordActual, {
    path: ['passwordNueva'],
    message: 'Tiene que ser distinta de la actual',
  })
  .refine((v) => v.passwordNueva === v.confirmar, NO_COINCIDEN)

export type CambioPasswordValues = z.infer<typeof cambioPasswordSchema>

export const valoresVacios: CambioPasswordValues = { passwordActual: '', passwordNueva: '', confirmar: '' }
