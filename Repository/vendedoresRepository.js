const { BaseRepository } = require('./baseRepository');

class VendedoresRepository extends BaseRepository {
  constructor() {
    super('vendedores');
  }
}

module.exports = new VendedoresRepository();
