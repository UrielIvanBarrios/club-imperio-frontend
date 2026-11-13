/// <reference types="vite/client" />

// Tipado de las variables del .env (solo las que empiezan con VITE_ llegan al navegador).
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
