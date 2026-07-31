import { NotFoundError } from "../../core/errors/errors.js";

export const createCrudService = (repository, entityName, ownerField) => ({
  async list({ page = 1, limit = 50, activeOnly, ownerId }) {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
    const where = {
      ...(activeOnly === "true" ? { isActive: true } : {}),
      ...(ownerId ? { [ownerField]: ownerId } : {}),
    };
    const [data, total] = await Promise.all([
      repository.findMany({ skip: (safePage - 1) * safeLimit, take: safeLimit, where }),
      repository.count(where),
    ]);
    return { data, meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) } };
  },

  async get(id) {
    const item = await repository.findById(id);
    if (!item) throw new NotFoundError(`${entityName} not found`);
    return item;
  },

  create: (data) => repository.create(data),

  async update(id, data) {
    await this.get(id);
    return repository.update(id, data);
  },

  async remove(id) {
    await this.get(id);
    return repository.remove(id);
  },
});
