import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiError } from './api/client'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'
import { ModoColorProvider } from './components/modo/ModoColorProvider'
import { ToastProvider } from './components/toast/ToastProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reintentar solo errores de red o del servidor: un 400/401/403 va a fallar igual.
      retry: (intentos, error) =>
        intentos < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Tema (src/theme.ts) en modo claro u oscuro, según lo que eligió el usuario o su sistema */}
    <ModoColorProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ModoColorProvider>
  </StrictMode>,
)
