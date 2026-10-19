require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pool, verifyConnection } = require('./Config/database');
const AppError = require('./Config/errors');
const asyncHandler = require('./Config/asyncHandler');

const app = express();
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un puerto válido.');
}

const allowedOrigins = (process.env.CORS_ORIGIN
  || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError('Origen no permitido por la política CORS.', 403));
  }
}));
app.use(express.json({ limit: '1mb' }));

const apiEndpoints = {
  health: 'GET /api/health',
  auth: 'POST /api/auth/login',
  usuarios: '/api/usuarios',
  administradores: '/api/administradores',
  clientes: '/api/clientes',
  vendedores: '/api/vendedores',
  viajes: '/api/viajes',
  reservas: '/api/reservas',
  collectionMethods: ['GET', 'POST'],
  recordMethods: ['GET', 'PUT', 'DELETE'],
  recordUrl: '/:id'
};

app.get(['/', '/api'], (req, res) => {
  res.json({
    name: 'Turismo_backend API',
    status: 'ok',
    message: 'Selecciona uno de los endpoints disponibles.',
    endpoints: apiEndpoints
  });
});

app.get('/api/health', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
}));

app.use('/api/auth', require('./Routes/authRoutes'));
app.use('/api/usuarios', require('./Routes/usuariosRoutes'));
app.use('/api/administradores', require('./Routes/administradoresRoutes'));
app.use('/api/clientes', require('./Routes/clientesRoutes'));
app.use('/api/vendedores', require('./Routes/vendedoresRoutes'));
app.use('/api/viajes', require('./Routes/viajesRoutes'));
app.use('/api/reservas', require('./Routes/reservasRoutes'));

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado.',
    method: req.method,
    path: req.originalUrl,
    message: 'Revisa el método HTTP y la URL. Consulta GET /api para ver las rutas disponibles.',
    endpoints: apiEndpoints
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  const databaseErrors = {
    ER_DUP_ENTRY: 'Ya existe un registro con esos datos.',
    ER_NO_REFERENCED_ROW_2: 'La operación referencia un registro relacionado inexistente.',
    ER_ROW_IS_REFERENCED_2: 'No se puede eliminar el registro porque tiene relaciones.',
    ER_BAD_NULL_ERROR: 'Falta un campo obligatorio.',
    ER_DATA_TOO_LONG: 'Uno de los valores supera la longitud permitida.',
    ER_TRUNCATED_WRONG_VALUE: 'Uno de los valores no tiene un formato válido.',
    ER_NO_DEFAULT_FOR_FIELD: 'Falta un campo obligatorio sin valor predeterminado.'
  };
  const knownMessage = error.code && databaseErrors[error.code];
  if (knownMessage) {
    const statusCode = ['ER_BAD_NULL_ERROR', 'ER_NO_DEFAULT_FOR_FIELD'].includes(error.code)
      ? 400
      : 409;
    return res.status(statusCode).json({ error: knownMessage });
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'El cuerpo de la petición no contiene JSON válido.' });
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${error.message}`);
    if (error.code) console.error(`Código MySQL: ${error.code}`);
  } else if (statusCode >= 400) {
    console.warn(`[${new Date().toISOString()}] ${statusCode} ${req.method} ${req.originalUrl}: ${error.message}`);
  }
  return res.status(statusCode).json({
    error: statusCode === 500 ? 'Error interno del servidor.' : error.message
  });
});

async function start() {
  try {
    await verifyConnection();
  } catch (error) {
    console.error('No se pudo conectar con MySQL. Revisa las variables DB_* del archivo .env.');
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const server = app.listen(port, () => {
    console.log(`Turismo_backend escuchando en http://localhost:${port}`);
    console.log(`Base de datos "${process.env.DB_NAME}" conectada correctamente.`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `El puerto ${port} ya está en uso. Detén el otro servidor o cambia PORT en el archivo .env y vuelve a iniciar.`
      );
    } else {
      console.error(`No se pudo iniciar el servidor: ${error.message}`);
    }

    pool.end().catch((closeError) => {
      console.error(`No se pudo cerrar el pool de MySQL: ${closeError.message}`);
    });
    process.exitCode = 1;
  });

  const shutdown = async () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
