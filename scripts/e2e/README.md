# Pruebas E2E

Recorren la app como un usuario (escriben en los formularios, hacen click, navegan) contra el **back real**.

```bash
npm run test:e2e              # todas
npm run test:e2e -- personas  # solo las que tengan "personas" en el nombre
```

## Cómo funcionan
- **jsdom** simula el navegador (DOM, `localStorage`, historial) y **Vite** compila `src/main.tsx` igual que en `npm run dev`. No es una copia de la app: es el mismo código.
- Las llamadas van al back de verdad (`VITE_API_URL`, por defecto `http://localhost:8080`).
- **Cada prueba borra al final lo que creó.** El back solo tiene baja lógica, así que la limpieza se hace por SQL (`psql`) y se limita a los registros de esa corrida.
- Lo que **no** cubren: lo visual (colores, responsive) y CORS, que solo lo aplica un navegador real.

| Archivo | Qué prueba |
|---|---|
| `login.e2e.mjs` | Login, validaciones, rutas protegidas, roles (USER → 403 sin cerrar sesión), 401 → login, sesión vencida, back caído. Crea un USER temporal `e2e-…@clubimperio.com` y lo borra. |
| `personas.e2e.mjs` | ABM de Personas: skeleton, validaciones, alta con membresía, DNI duplicado, edición (incluido vaciar el email), búsqueda, paginación, baja con confirmación, reactivación, error con reintentar, links inválidos. Crea 9 personas `TEST-FRONT` (DNI `99xxxxxx`) y las borra. |

## Requisitos
- Back levantado y PostgreSQL accesible (`psql` en el PATH o en `C:\Program Files\PostgreSQL\18\bin`).
- Credenciales: se leen de estas variables de entorno, o del `application.properties` del back (`../club-imperio-backend`) si no están definidas.

| Variable | Para qué |
|---|---|
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Login del ADMIN |
| `E2E_DB_PASSWORD` (y `PGHOST`, `PGUSER`, `PGDATABASE`) | Limpieza por SQL |
| `E2E_PSQL` | Ruta a `psql`, si no está en el lugar de siempre |

Si quedaran datos de una corrida cortada a la mitad: `scripts/sql/limpiar-personas-test-front.sql`.
