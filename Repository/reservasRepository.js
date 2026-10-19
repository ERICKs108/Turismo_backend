const { BaseRepository } = require('./baseRepository');

class ReservasRepository extends BaseRepository {
  constructor() {
    super('reservas');
  }
}

module.exports = new ReservasRepository();
