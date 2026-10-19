const { BaseRepository } = require('./baseRepository');

class AdministradoresRepository extends BaseRepository {
  constructor() {
    super('administradores');
  }
}

module.exports = new AdministradoresRepository();
