import { api } from './client'
import type { LoginRequest, LoginResponse } from './types'

export function login(data: LoginRequest) {
  return api<LoginResponse>('/api/auth/login', { method: 'POST', body: data, auth: false })
}
