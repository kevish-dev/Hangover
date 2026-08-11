export const createCrudController = (service, { ownerQuery }) => ({
  list: async (req, res, next) => {
    try {
      res.json(await service.list({ ...req.query, ownerId: req.query[ownerQuery] }));
    } catch (error) { next(error); }
  },
  get: async (req, res, next) => {
    try { res.json(await service.get(req.params.id)); } catch (error) { next(error); }
  },
  create: async (req, res, next) => {
    try { res.status(201).json(await service.create(req.body)); } catch (error) { next(error); }
  },
  update: async (req, res, next) => {
    try { res.json(await service.update(req.params.id, req.body)); } catch (error) { next(error); }
  },
  remove: async (req, res, next) => {
    try { await service.remove(req.params.id); res.status(204).send(); } catch (error) { next(error); }
  },
});
