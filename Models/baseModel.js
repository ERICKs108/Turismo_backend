const bcrypt = require('bcrypt');
const AppError = require('../Config/errors');

const isPasswordColumn = (name) => /(password|contrasena|contraseña|clave)/i.test(name);

class BaseModel {
  constructor(repository) {
    this.repository = repository;
  }

  async list() {
    return this.repository.list();
  }

  async getById(id) {
    await this.validateId(id);
    return this.repository.getById(id);
  }

  async validateId(id) {
    const schema = await this.repository.getSchema();
    const type = schema.primaryKey.data_type.toLowerCase();
    const integerTypes = new Set([
      'bigint', 'int', 'mediumint', 'smallint', 'tinyint'
    ]);
    const decimalTypes = new Set(['decimal', 'double', 'float', 'numeric', 'real']);
    if (integerTypes.has(type) && !/^-?\d+$/.test(id)) {
      throw new AppError('El identificador debe ser un entero para esta tabla.', 400);
    }
    if (decimalTypes.has(type) && !/^-?\d+(?:\.\d+)?$/.test(id)) {
      throw new AppError('El identificador debe ser numérico para esta tabla.', 400);
    }
  }

  async validate(values, { creating }) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      throw new AppError('El cuerpo debe ser un objeto JSON.', 400);
    }

    const schema = await this.repository.getSchema();
    const knownColumns = new Map(schema.columns.map((column) => [column.column_name, column]));
    const normalized = {};

    for (const [name, value] of Object.entries(values)) {
      const column = knownColumns.get(name);
      if (!column) {
        throw new AppError(`El campo "${name}" no existe en la tabla.`, 400);
      }
      if (column.generation_expression || /GENERATED/i.test(column.extra)) {
        throw new AppError(`El campo "${name}" es generado y no se puede modificar.`, 400);
      }
      if (!creating && name === schema.primaryKey.column_name) {
        throw new AppError('No se puede modificar la clave primaria.', 400);
      }
      if (value === undefined) continue;
      if (value === null && column.is_nullable === 'NO') {
        throw new AppError(`El campo "${name}" no admite valores nulos.`, 400);
      }
      if (value !== null && typeof value === 'object' && column.data_type !== 'json') {
        throw new AppError(`El campo "${name}" debe contener un valor simple.`, 400);
      }
      normalized[name] = isPasswordColumn(name)
        ? await this.hashPassword(value, name)
        : value;
    }

    if (!creating && Object.keys(normalized).length === 0) {
      throw new AppError('Indica al menos un campo para actualizar.', 400);
    }

    if (creating) {
      for (const column of schema.columns) {
        const required = column.is_nullable === 'NO'
          && column.column_default === null
          && !/auto_increment/i.test(column.extra)
          && !column.generation_expression
          && !/GENERATED/i.test(column.extra);
        if (required && !Object.prototype.hasOwnProperty.call(normalized, column.column_name)) {
          throw new AppError(`El campo "${column.column_name}" es obligatorio.`, 400);
        }
      }
    }

    return normalized;
  }

  async hashPassword(value, columnName) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new AppError(`El campo "${columnName}" debe ser una contraseña no vacía.`, 400);
    }
    if (Buffer.byteLength(value, 'utf8') > 72) {
      throw new AppError(`El campo "${columnName}" no puede superar 72 bytes.`, 400);
    }
    if (/^\$2[aby]\$\d{2}\$/.test(value)) return value;
    return bcrypt.hash(value, 12);
  }

  async create(values) {
    const normalized = await this.validate(values, { creating: true });
    const id = await this.repository.create(normalized);
    return id === null ? null : this.repository.getById(id);
  }

  async update(id, values) {
    await this.validateId(id);
    const normalized = await this.validate(values, { creating: false });
    return this.repository.update(id, normalized);
  }

  async delete(id) {
    await this.validateId(id);
    return this.repository.delete(id);
  }
}

module.exports = BaseModel;
