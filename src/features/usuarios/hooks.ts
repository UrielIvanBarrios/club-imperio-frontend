import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { usuariosApi } from './api'
import type { Usuario, UsuarioUpdateRequest } from './types'

// Capa 2: hooks de TanStack Query. Las pantallas usan esto, nunca usuariosApi directo.

export const usuariosKeys = {
  all: ['usuarios'] as const,
  list: () => [...usuariosKeys.all, 'list'] as const,
  detail: (id: string) => [...usuariosKeys.all, 'detail', id] as const,
}

// ---------- Lecturas ----------

export function useUsuarios() {
  return useQuery({ queryKey: usuariosKeys.list(), queryFn: usuariosApi.listar })
}

export function useUsuario(id: string | undefined) {
  return useQuery({
    queryKey: usuariosKeys.detail(id ?? ''),
    queryFn: () => usuariosApi.obtener(id!),
    enabled: !!id,
  })
}

// ---------- Escrituras ----------

export function useCrearUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: usuariosApi.crear,
    onSuccess: (usuario) => {
      qc.invalidateQueries({ queryKey: usuariosKeys.all })
      qc.setQueryData(usuariosKeys.detail(usuario.usuarioId), usuario)
    },
  })
}

// También se usa para reactivar ({ activo: true }) y para resetear la contraseña ({ password }).
export function useActualizarUsuario() {
  const qc = useQueryClient()
  const { actualizarUsuario } = useAuth()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UsuarioUpdateRequest }) => usuariosApi.actualizar(id, data),
    onSuccess: (usuario) => {
      qc.invalidateQueries({ queryKey: usuariosKeys.all })
      qc.setQueryData(usuariosKeys.detail(usuario.usuarioId), usuario)
      // Si el ADMIN se editó a sí mismo, la barra superior tiene que mostrar el nombre nuevo
      actualizarUsuario(usuario)
    },
  })
}

export function useDesactivarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (usuario: Usuario) => usuariosApi.desactivar(usuario.usuarioId),
    onSuccess: () => qc.invalidateQueries({ queryKey: usuariosKeys.all }),
  })
}
