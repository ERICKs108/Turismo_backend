# Turismo_backend

API REST en Node.js, Express y MySQL para administrar las tablas existentes `usuarios`, `administradores`, `clientes`, `vendedores`, `viajes` y `reservas`.

## Estructura

```text
Turismo_backend/
|-- Config/
|   |-- asyncHandler.js
|   |-- auth.js
|   |-- database.js
|   `-- errors.js
|-- Controllers/
|   |-- authController.js
|   |-- resourceController.js
|   |-- administradoresController.js
|   |-- clientesController.js
|   |-- reservasController.js
|   |-- usuariosController.js
|   |-- vendedoresController.js
|   `-- viajesController.js
|-- Models/
|   |-- baseModel.js
|   |-- administradoresModel.js
|   |-- clientesModel.js
|   |-- reservasModel.js
|   |-- usuariosModel.js
|   |-- vendedoresModel.js
|   `-- viajesModel.js
|-- Repository/
|   |-- baseRepository.js
|   |-- administradoresRepository.js
|   |-- clientesRepository.js
|   |-- reservasRepository.js
|   |-- usuariosRepository.js
|   |-- vendedoresRepository.js
|   `-- viajesRepository.js
|-- Routes/
|   |-- authRoutes.js
|   |-- resourceRoutes.js
|   |-- administradoresRoutes.js
|   |-- clientesRoutes.js
|   |-- reservasRoutes.js
|   |-- usuariosRoutes.js
|   |-- vendedoresRoutes.js
|   `-- viajesRoutes.js
|-- .env.example
|-- .gitignore
|-- package.json
|-- package-lock.json
|-- README.md
`-- server.js
```

### Responsabilidad de los archivos

- `Config/database.js`: crea el pool `mysql2/promise` y verifica la conexión sin exponer credenciales.
- `Config/errors.js` y `Config/asyncHandler.js`: errores HTTP y manejo de operaciones asíncronas.
- `Config/auth.js`: valida JWT y protege operaciones que requieren rol administrador.
- `Repository/baseRepository.js`: inspecciona `information_schema` y realiza SQL parametrizado usando las columnas y clave primaria existentes. Los repositorios específicos seleccionan su tabla.
- `Models/baseModel.js`: valida columnas y campos obligatorios contra el esquema real; guarda contraseñas con bcrypt.
- `Controllers/resourceController.js`: implementa las respuestas CRUD; los controladores de entidad lo conectan con su modelo.
- `Controllers/authController.js`: inicia sesión usando una columna de correo/usuario y contraseña detectadas en `usuarios`.
- `Routes/resourceRoutes.js`: define las rutas CRUD; los archivos de entidad asignan el controlador y sus permisos.
- `server.js`: configura Express, CORS, rutas, health check, errores y arranque después de verificar MySQL.

## Instalación y configuración

Requiere Node.js 18 o superior y una instancia MySQL con la base `bd_turismo` y las seis tablas existentes.

```powershell
npm install
Copy-Item .env.example .env
```

Edita `.env` y coloca las credenciales locales de MySQL. No se presupone ni se incluye ninguna contraseña. `DB_PASSWORD` puede quedar vacío solamente si la cuenta local realmente no tiene contraseña. Configura además `JWT_SECRET` con un secreto aleatorio de al menos 32 caracteres y ajusta `CORS_ORIGIN` a los orígenes de tu frontend.

Ejemplo para crear un secreto aleatorio en PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

La aplicación no crea, altera ni elimina tablas. Al recibir la primera petición de un recurso, consulta los metadatos reales. Cada tabla debe tener una sola clave primaria para que funcionen las rutas `/:id`; las columnas obligatorias se determinan con `information_schema`. Si una tabla falta o usa clave primaria compuesta, la API lo reportará como error de configuración.

## Ejecución

```powershell
npm start
```

Modo de desarrollo:

```powershell
npm run dev
```

El servidor escucha por defecto en `http://localhost:3000`, solo después de comprobar la conexión a MySQL. `npm run check` comprueba la sintaxis del archivo principal.

## Endpoints

| Recurso | Colección | Registro por ID |
|---|---|---|
| Usuarios | `http://localhost:3000/api/usuarios` | `http://localhost:3000/api/usuarios/:id` |
| Administradores | `http://localhost:3000/api/administradores` | `http://localhost:3000/api/administradores/:id` |
| Clientes | `http://localhost:3000/api/clientes` | `http://localhost:3000/api/clientes/:id` |
| Vendedores | `http://localhost:3000/api/vendedores` | `http://localhost:3000/api/vendedores/:id` |
| Viajes | `http://localhost:3000/api/viajes` | `http://localhost:3000/api/viajes/:id` |
| Reservas | `http://localhost:3000/api/reservas` | `http://localhost:3000/api/reservas/:id` |

Abre `http://localhost:3000/` o `http://localhost:3000/api` para ver el índice JSON de rutas. Cada colección admite `GET` (listar) y `POST` (crear); cada URL `/:id` admite `GET`, `PUT` (actualizar) y `DELETE`. También están disponibles `GET /api/health` y `POST /api/auth/login`. Si la URL o método no existe, el error `404` indica el método, la ruta solicitada y dónde consultar los endpoints disponibles.

### Ejemplos de solicitudes

Reemplaza `:id`, los nombres de campo y los valores de los cuerpos con los que existan realmente en tu tabla. El backend no puede inferir un cuerpo de ejemplo correcto sin conocer las columnas.

```http
GET http://localhost:3000/api/viajes
```

```http
GET http://localhost:3000/api/viajes/1
```

```http
POST http://localhost:3000/api/viajes
Content-Type: application/json

{
  "CAMPO_OBLIGATORIO_REAL": "valor"
}
```

```http
PUT http://localhost:3000/api/viajes/1
Content-Type: application/json

{
  "CAMPO_EXISTENTE": "nuevo valor"
}
```

```http
DELETE http://localhost:3000/api/viajes/1
```

Usa la misma forma de URL sustituyendo `viajes` por `usuarios`, `administradores`, `clientes`, `vendedores` o `reservas`. Los campos no reconocidos, claves primarias modificadas o requeridos ausentes devuelven `400`; registros inexistentes `404`; duplicados o conflictos de clave foránea `409`. Las respuestas de lectura nunca incluyen columnas cuyo nombre indique contraseña, clave o secreto.

### Autenticación y permisos

El inicio de sesión espera `identifier` y `password`. Detecta columnas comunes de correo/usuario y una columna llamada de forma similar a `password`, `contrasena` o `clave`. La contraseña debe estar almacenada como hash bcrypt; las contraseñas nuevas aceptan hasta 72 bytes UTF-8, el límite de bcrypt. Si el usuario está vinculado a `administradores` mediante clave foránea a `usuarios`, o su columna de rol indica administrador, recibirá rol `admin`.

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "identifier": "correo-o-usuario-real",
  "password": "contraseña"
}
```

Para crear, actualizar o eliminar usuarios o administradores se requiere `Authorization: Bearer <token>` de un administrador. Las demás rutas CRUD no requieren token de forma predeterminada. Las relaciones y restricciones de la base de datos determinan qué eliminaciones son posibles; no se deshabilitan ni se fuerzan las claves foráneas.

## Verificación

Con `.env` correctamente configurado:

1. `npm start` debe anunciar que la base configurada está conectada.
2. `GET /api/health` debe responder `{"status":"ok","database":"connected"}`.
3. Usa GET antes de POST/PUT/DELETE para confirmar el esquema y seleccionar datos válidos.
4. Verifica los cambios y relaciones directamente con GET; un conflicto de clave foránea responde `409`.

No se ejecutaron pruebas de integración contra MySQL porque este espacio de trabajo no incluye credenciales ni un volcado del esquema. Se deben probar los POST/PUT/DELETE con datos de desarrollo adecuados para evitar cambiar información real.

### Errores frecuentes

- `ECONNREFUSED`: inicia MySQL y comprueba `DB_HOST`/`DB_PORT`.
- `EADDRINUSE` / `address already in use`: otro proceso ya ocupa `PORT`. Si ese proceso es tu servidor y `/api/health` responde, úsalo sin iniciar una segunda instancia. En caso contrario, detén el proceso correcto o cambia `PORT` en `.env` (por ejemplo, `PORT=3001`) y reinicia.
- `ER_ACCESS_DENIED_ERROR`: confirma `DB_USER` y `DB_PASSWORD` en `.env`.
- Base de datos o tabla inexistente: confirma `DB_NAME=bd_turismo` y los nombres de las tablas.
- `JWT_SECRET debe configurarse`: configura un secreto aleatorio de al menos 32 caracteres.
- `No se pudo identificar...` al iniciar sesión: revisa que `usuarios` tenga columnas de acceso reconocibles; la API no inventa columnas.
- Conflicto `409` al borrar: hay registros dependientes; conserva la relación y elimina solo según las reglas del negocio.
