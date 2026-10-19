const { BaseRepository } = require('./baseRepository');

class UsuariosRepository extends BaseRepository {
  constructor() {
    super('usuarios');
  }
}

module.exports = new UsuariosRepository();
