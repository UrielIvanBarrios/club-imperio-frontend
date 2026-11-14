import { useMutation, useQuery } from '@tanstack/react-query'
import { perfilApi } from './api'

export const perfilKeys = {
  me: ['auth', 'me'] as const,
}

export function useMe() {
  return useQuery({ queryKey: perfilKeys.me, queryFn: perfilApi.me })
}

export function useCambiarMiPassword() {
  return useMutation({ mutationFn: perfilApi.cambiarPassword })
}
