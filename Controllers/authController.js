const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../Config/database');
const { getSecret } = require('../Config/auth');
const AppError = require('../Config/errors');
const usuariosRepository = require('../Repository/usuariosRepository');

const loginColumnOrder = [
  'email', 'correo', 'correo_electronico', 'username', 'usuario',
  'nombre_usuario', 'login', 'user'
];
const passwordPattern = /(password|contrasena|contraseña|clave)/i;
const rolePattern = /^(role|rol)(_|$)|^(tipo_usuario|tipo)$/i;

function selectLoginColumn(columns) {
  const strings = columns.filter((column) =>
    /char|text/i.test(column.data_type) && !passwordPattern.test(column.column_name)
  );
  for (const candidate of loginColumnOrder) {
    const match = strings.find((column) => column.column_name.toLowerCase() === candidate);
    if (match) return match;
  }
  return null;
}

async function isAdministrator(user, userSchema) {
  const roleColumn = userSchema.columns.find((column) => rolePattern.test(column.column_name));
  if (roleColumn && /^(admin|administrador)$/i.test(String(user[roleColumn.column_name]))) {
    return true;
  }

  const [relations] = await pool.execute(
    `SELECT column_name
     FROM information_schema.key_column_usage
     WHERE table_schema = DATABASE()
       AND table_name = 'administradores'
       AND referenced_table_name = 'usuarios'
       AND referenced_column_name = ?`,
    [userSchema.primaryKey.column_name]
  );
  if (relations.length === 0) return false;

  const column = `\`${relations[0].column_name.replace(/`/g, '``')}\``;
  const [rows] = await pool.execute(
    `SELECT 1 FROM \`administradores\` WHERE ${column} = ? LIMIT 1`,
    [user[userSchema.primaryKey.column_name]]
  );
  return rows.length > 0;
}

async function login(req, res) {
  const { identifier, password } = req.body || {};
  if (typeof identifier !== 'string' || identifier.trim() === ''
      || typeof password !== 'string' || password === '') {
    throw new AppError('Envía "identifier" y "password" como texto.', 400);
  }

  const schema = await usuariosRepository.getSchema();
  const loginColumn = selectLoginColumn(schema.columns);
  const passwordColumn = schema.columns.find((column) => passwordPattern.test(column.column_name));
  if (!loginColumn || !passwordColumn) {
    throw new AppError(
      'No se pudo identificar en usuarios una columna de correo/usuario y otra de contraseña.',
      503
    );
  }

  const user = await usuariosRepository.findByColumn(loginColumn.column_name, identifier.trim());
  const storedPassword = user && user[passwordColumn.column_name];
  const passwordMatches = typeof storedPassword === 'string'
    && /^\$2[aby]\$\d{2}\$/.test(storedPassword)
    && await bcrypt.compare(password, storedPassword);
  if (!passwordMatches) {
    throw new AppError('Credenciales incorrectas.', 401);
  }

  const role = await isAdministrator(user, schema) ? 'admin' : 'user';
  const token = jwt.sign(
    { sub: String(user[schema.primaryKey.column_name]), role },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h', issuer: 'turismo-backend' }
  );
  res.json({ token, tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
}

module.exports = { login };
