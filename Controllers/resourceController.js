const AppError = require('../Config/errors');

function getId(req) {
  const id = req.params.id;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new AppError('El identificador de la ruta no es válido.', 400);
  }
  return id;
}

function createResourceController(model) {
  return {
    list: async (req, res) => {
      res.json({ data: await model.list() });
    },
    getById: async (req, res) => {
      const record = await model.getById(getId(req));
      if (!record) throw new AppError('No se encontró el registro solicitado.', 404);
      res.json({ data: record });
    },
    create: async (req, res) => {
      const record = await model.create(req.body);
      res.status(201).json({ message: 'Registro creado correctamente.', data: record });
    },
    update: async (req, res) => {
      const record = await model.update(getId(req), req.body);
      if (!record) throw new AppError('No se encontró el registro solicitado.', 404);
      res.json({ message: 'Registro actualizado correctamente.', data: record });
    },
    delete: async (req, res) => {
      const deleted = await model.delete(getId(req));
      if (!deleted) throw new AppError('No se encontró el registro solicitado.', 404);
      res.json({ message: 'Registro eliminado correctamente.' });
    }
  };
}

module.exports = createResourceController;
