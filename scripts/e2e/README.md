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
| `actividades.e2e.mjs` | ABM de Actividades: validaciones (precio con coma, negativo), alta, nombre duplicado (alta y renombre), edición (incluido vaciar la descripción), búsqueda sin tildes, paginación, **baja en cascada** (el modal cuenta las comisiones; después quedan inactivas y la inscripción dada de baja), reactivación, error con reintentar. Crea actividades `TEST-FRONT <corrida> …`, 2 comisiones y un socio, y los borra. |
| `comisiones.e2e.mjs` | ABM de Comisiones: el alta solo ofrece actividades activas y llega con la actividad del filtro, validaciones (vacío, solo espacios, cupo 0), duplicado con otras mayúsculas, **cupo ocupado/total** con 3 inscriptos, **cupo por debajo de los inscriptos → error del back en el campo**, casilla **"Sin tope de cupo"** (quitar y volver a poner el tope con inscriptos), las validaciones del alta también en el back (por API), filtro por actividad + búsqueda, **baja en cascada** (el modal cuenta las inscripciones), comisión dada de baja no editable, navegación desde la actividad. Crea 3 actividades `TEST-FRONT <corrida> …`, sus comisiones y 3 socios, y los borra. |
| `importar.e2e.mjs` | Importar socios con `api-tests/socios-ejemplo.csv` del back (7 filas: 4 válidas, 3 con error): descarga de la plantilla (con BOM), extensión inválida (sin llamar al back), columnas faltantes y archivo dañado (400), más de 5 MB (413), elegir y **arrastrar** el archivo, simulación con totales y errores por fila (sin guardar nada), importación real (4, con su membresía), reimportar el mismo archivo (7 duplicados), back caído. Borra las personas importadas en esa corrida. |
| `inscripciones.e2e.mjs` | Inscribir socio: obligatorios, búsqueda del socio por parte del DNI o por nombre sin tildes (la persona dada de baja aparece deshabilitada), solo actividades y comisiones activas, **cupo libre** en cada comisión (completa y "ya está inscripto" deshabilitadas), llegada desde el socio y desde la comisión con el dato precargado (y vuelta al origen), los **cuatro rechazos del back** en su campo (cupo agotado, ya inscripto, comisión y persona dadas de baja con el formulario abierto), error con reintentar. Crea una actividad `TEST-FRONT <corrida> …` con 6 comisiones y 4 socios, y los borra. |
| `asistencia.e2e.mjs` | Tomar asistencia: comisión y fecha en la URL, marcar con un click (Presente / Ausente, "Todos presentes"), **toda la clase en un solo POST** (y lo cargado sale del GET por comisión y fecha), clase **ya cargada** (entera o a medias), **el back rechaza el lote** (alguien cargó a uno y dieron de baja a otro mientras se marcaba: lista de errores por alumno y no se guarda ninguna), quien se inscribió después de la clase no se marca, **corregir** una asistencia cargada (con back caído y reintentar), fecha futura, back caído al guardar (las marcas no se pierden), comisión sin inscriptos o dada de baja, llegada desde la comisión. **Historial** en el detalle del socio (resumen por comisión y más reciente primero). Crea una actividad `TEST-FRONT <corrida> …` con 4 comisiones, 6 socios y sus asistencias (antedata las inscripciones por SQL, porque el back no acepta asistencias anteriores a la inscripción), y los borra. |
| `login.e2e.mjs` | Login, validaciones, rutas protegidas, roles (USER → 403 sin cerrar sesión), 401 → login, sesión vencida, back caído. Crea un USER temporal `e2e-…@clubimperio.com` y lo borra. |
| `usuarios.e2e.mjs` | ABM de Usuarios y Mi perfil: el ADMIN no puede desactivarse ni quitarse el rol (opciones deshabilitadas con la explicación), validaciones (contraseña de 8 a 72 bytes, confirmación), alta con email normalizado, email duplicado, edición de rol, editarse a sí mismo actualiza la barra, reset de contraseña de otro, desactivar/reactivar (verificado con login real), filtros. Perfil: actual incorrecta → error en el campo sin cerrar sesión, cambio de la propia contraseña como USER. Crea usuarios `e2e-<corrida>-…` y los borra; **nunca cambia la contraseña del ADMIN** y restaura su nombre. |
| `personas.e2e.mjs` | ABM de Personas: skeleton, validaciones, alta con membresía, DNI duplicado, edición (incluido vaciar el email), búsqueda, paginación, baja con confirmación, reactivación, error con reintentar, links inválidos. Crea 9 personas `TEST-FRONT` (DNI `99xxxxxx`) y las borra. |

## Requisitos
- Back levantado y PostgreSQL accesible (`psql` en el PATH o en `C:\Program Files\PostgreSQL\18\bin`).
- Credenciales: se leen de estas variables de entorno, o del `application.properties` del back (`../club-imperio-backend`) si no están definidas.

| Variable | Para qué |
|---|---|
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Login del ADMIN |
| `E2E_DB_PASSWORD` (y `PGHOST`, `PGUSER`, `PGDATABASE`) | Limpieza por SQL |
| `E2E_PSQL` | Ruta a `psql`, si no está en el lugar de siempre |
| `E2E_TIMEOUT_MS` | Espera máxima por cada condición (por defecto 10000). Subirla si la máquina está cargada y aparecen fallas por tiempo |

Si quedaran datos de una corrida cortada a la mitad: `scripts/sql/limpiar-actividades-test-front.sql` y después `scripts/sql/limpiar-personas-test-front.sql`.
