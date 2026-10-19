const { BaseRepository } = require('./baseRepository');

class ViajesRepository extends BaseRepository {
  constructor() {
    super('viajes');
  }
}

module.exports = new ViajesRepository();
