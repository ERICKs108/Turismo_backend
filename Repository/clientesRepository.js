const { BaseRepository } = require('./baseRepository');

class ClientesRepository extends BaseRepository {
  constructor() {
    super('clientes');
  }
}

module.exports = new ClientesRepository();
