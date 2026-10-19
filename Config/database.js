require('dotenv').config();

const mysql = require('mysql2/promise');
const AppError = require('./errors');

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new AppError(`Falta configurar la variable de entorno ${name}.`, 500);
  }
  return value;
}

const port = Number(process.env.DB_PORT || 3306);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new AppError('DB_PORT debe ser un puerto válido.', 500);
}

const pool = mysql.createPool({
  host: required('DB_HOST'),
  port,
  user: required('DB_USER'),
  password: process.env.DB_PASSWORD || '',
  database: required('DB_NAME'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  decimalNumbers: true
});

async function verifyConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

module.exports = { pool, verifyConnection };
