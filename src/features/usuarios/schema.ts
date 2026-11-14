import { z } from 'zod'
import type { Rol, Usuario, UsuarioCreateRequest, UsuarioUpdateRequest } from './types'

// Mismas reglas que el back (UsuarioService): nombre obligatorio, email válido y único, rol obligatorio,
// contraseña de 8 caracteres como mínimo. Largos de la tabla: email varchar(150), nombre varchar(100).
const esEmail = (v: string) => z.email().safeParse(v).success

// BCrypt solo usa los primeros 72 bytes, y el back no lo controla: con una contraseña más larga
// respondería un error técnico. Se cuentan bytes, no letras: una tilde o una ñ ocupan 2.
const bytes = (v: string) => new TextEncoder().encode(v).length

// Regla de la contraseña nueva: la usan el alta, el reset del ADMIN y el cambio en Perfil.
export const reglaPasswordNueva = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .refine((v) => bytes(v) <= 72, 'Demasiado larga: máximo 72 caracteres (menos si tiene tildes o ñ)')

// "Repetí la contraseña": el error va en el campo de confirmación
export const NO_COINCIDEN = { path: ['confirmar'], message: 'Las contraseñas no coinciden' }

const ROLES: Rol[] = ['ADMIN', 'USER']

// Alta: con contraseña. Edición: sin contraseña (se cambia aparte, con su propio diálogo).
export function usuarioSchema(modo: 'alta' | 'edicion') {
  return z
    .object({
      nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
      email: z
        .string()
        .trim()
        .min(1, 'El email es obligatorio')
        .max(150, 'Máximo 150 caracteres')
        .refine(esEmail, 'El email no es válido'),
      rol: z.string().refine((v) => ROLES.includes(v as Rol), 'Elegí el rol'),
      password: modo === 'alta' ? reglaPasswordNueva : z.string(),
      confirmar: z.string(),
    })
    .refine((v) => modo !== 'alta' || v.password === v.confirmar, NO_COINCIDEN)
}

export type UsuarioFormValues = z.infer<ReturnType<typeof usuarioSchema>>

export const valoresVacios: UsuarioFormValues = { nombre: '', email: '', rol: '', password: '', confirmar: '' }

export function aFormulario(u: Usuario): UsuarioFormValues {
  return { nombre: u.nombre, email: u.email, rol: u.rol, password: '', confirmar: '' }
}

export function aCreateRequest(v: UsuarioFormValues): UsuarioCreateRequest {
  return { nombre: v.nombre, email: v.email.toLowerCase(), rol: v.rol as Rol, password: v.password }
}

export function aUpdateRequest(v: UsuarioFormValues): UsuarioUpdateRequest {
  return { nombre: v.nombre, email: v.email.toLowerCase(), rol: v.rol as Rol }
}

// Reset de contraseña por el ADMIN (no pide la actual)
export const resetPasswordSchema = z
  .object({ password: reglaPasswordNueva, confirmar: z.string() })
  .refine((v) => v.password === v.confirmar, NO_COINCIDEN)
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
