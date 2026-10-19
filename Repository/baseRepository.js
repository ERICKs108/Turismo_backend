const { pool } = require('../Config/database');
const AppError = require('../Config/errors');

const quoteIdentifier = (identifier) => `\`${identifier.replace(/`/g, '``')}\``;
const isPrivateColumn = (name) => /(password|contrasena|contraseña|clave|secret)/i.test(name);

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.schemaPromise = null;
  }

  async getSchema() {
    if (!this.schemaPromise) {
      this.schemaPromise = this.loadSchema().catch((error) => {
        this.schemaPromise = null;
        throw error;
      });
    }
    return this.schemaPromise;
  }

  async loadSchema() {
    const [columns] = await pool.execute(
      `SELECT column_name, data_type, is_nullable, column_default, extra,
              column_key, generation_expression
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ?
       ORDER BY ordinal_position`,
      [this.tableName]
    );

    if (columns.length === 0) {
      throw new AppError(
        `No existe la tabla "${this.tableName}" en la base de datos configurada.`,
        503
      );
    }

    const primaryKeys = columns.filter((column) => column.column_key === 'PRI');
    if (primaryKeys.length !== 1) {
      throw new AppError(
        `La tabla "${this.tableName}" debe tener exactamente una clave primaria para usar rutas por ID.`,
        503
      );
    }

    return {
      columns,
      primaryKey: primaryKeys[0],
      publicColumns: columns.filter((column) => !isPrivateColumn(column.column_name))
    };
  }

  async list() {
    const schema = await this.getSchema();
    const projection = schema.publicColumns.map((column) => quoteIdentifier(column.column_name)).join(', ');
    const [rows] = await pool.query(
      `SELECT ${projection} FROM ${quoteIdentifier(this.tableName)}`
    );
    return rows;
  }

  async getById(id) {
    const schema = await this.getSchema();
    const projection = schema.publicColumns.map((column) => quoteIdentifier(column.column_name)).join(', ');
    const [rows] = await pool.execute(
      `SELECT ${projection} FROM ${quoteIdentifier(this.tableName)}
       WHERE ${quoteIdentifier(schema.primaryKey.column_name)} = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async findByColumn(columnName, value) {
    const schema = await this.getSchema();
    if (!schema.columns.some((column) => column.column_name === columnName)) {
      throw new AppError('La columna de búsqueda no existe.', 503);
    }
    const projection = schema.columns.map((column) => quoteIdentifier(column.column_name)).join(', ');
    const [rows] = await pool.execute(
      `SELECT ${projection} FROM ${quoteIdentifier(this.tableName)}
       WHERE ${quoteIdentifier(columnName)} = ? LIMIT 1`,
      [value]
    );
    return rows[0] || null;
  }

  async create(values) {
    const entries = Object.entries(values);
    const schema = await this.getSchema();
    const primaryKey = schema.primaryKey.column_name;
    if (entries.length === 0) {
      const [result] = await pool.query(
        `INSERT INTO ${quoteIdentifier(this.tableName)} () VALUES ()`
      );
      return result.insertId || null;
    }
    const columns = entries.map(([name]) => quoteIdentifier(name)).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const [result] = await pool.execute(
      `INSERT INTO ${quoteIdentifier(this.tableName)} (${columns}) VALUES (${placeholders})`,
      entries.map(([, value]) => value)
    );
    const suppliedKey = values[primaryKey];
    return suppliedKey === undefined ? (result.insertId || null) : suppliedKey;
  }

  async update(id, values) {
    const entries = Object.entries(values);
    const schema = await this.getSchema();
    const assignments = entries.map(([name]) => `${quoteIdentifier(name)} = ?`).join(', ');
    await pool.execute(
      `UPDATE ${quoteIdentifier(this.tableName)} SET ${assignments}
       WHERE ${quoteIdentifier(schema.primaryKey.column_name)} = ?`,
      [...entries.map(([, value]) => value), id]
    );
    return this.getById(id);
  }

  async delete(id) {
    const schema = await this.getSchema();
    const [result] = await pool.execute(
      `DELETE FROM ${quoteIdentifier(this.tableName)}
       WHERE ${quoteIdentifier(schema.primaryKey.column_name)} = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = { BaseRepository, isPrivateColumn };
