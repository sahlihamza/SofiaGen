import requests from "./httpService";

/**
 * createCrudService — declaratively generate a typical admin REST client

 * for a resource. Replaces the ~40-line boilerplate in 90+ service files
 * (CategoryServices, CurrencyServices, BrandServices, etc.).
 *
 * @param {Object} cfg
 *   - resource {string}        — path segment used in URLs (e.g. "currency")
 *   - idParam {string}         — "id" (default) or "slug"
 *   - bulkAddPath {string}     — path for bulk add (default: "/add/all")
 *   - bulkDeletePath {string}  — path for bulk delete (default: "/delete/many")
 *   - bulkUpdatePath {string}  — path for bulk update (default: "/update/many")
 *   - custom {Object}          — extra methods to merge in

 *
 * The factory emits an object with:
 *   - getAll(params?)
 *   - getById(id)
 *   - add(body)
 *   - update(id, body)
 *   - delete(id)
 *   - deleteMany(body)
 *   - updateMany(body)
 *   - addAll(body)
 *
 * @example
 *   const CurrencyServices = createCrudService({ resource: "currency" });
 *   await CurrencyServices.getAll();
 *   await CurrencyServices.add({ name: "USD" });
 */
export const createCrudService = (cfg = {}) => {
  const {
    resource,
    idParam = "id",
    bulkAddPath = "/add/all",
    bulkDeletePath = "/delete/many",
    bulkUpdatePath = "/update/many",
    custom = {},
  } = cfg;

  if (!resource) {
    throw new Error("createCrudService: `resource` is required");
  }

  return {
    getAll: (params) => requests.get(`/${resource}`, params),
    getById: (id) => requests.get(`/${resource}/${id}`),
    add: (body) => requests.post(`/${resource}/add`, body),
    update: (id, body) => requests.put(`/${resource}/${id}`, body),
    delete: (id, body) => requests.delete(`/${resource}/${id}`, { data: body }),
    deleteMany: (body) => requests.patch(`/${resource}${bulkDeletePath}`, body),
    updateMany: (body) => requests.patch(`/${resource}${bulkUpdatePath}`, body),
    addAll: (body) => requests.post(`/${resource}${bulkAddPath}`, body),
    ...custom,
  };
};

export default createCrudService;
