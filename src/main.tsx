import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { esES } from '@mui/material/locale'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiError } from './api/client'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'
import { ToastProvider } from './components/toast/ToastProvider'

// esES: textos de MUI en español (paginación: "Filas por página", "1–10 de 25")
const theme = createTheme({}, esES)

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
