import requests from "./httpService";
import { createCrudService } from "./createCrudService";

// CRUD for Brand entities. Backend mounted at /api/brands/.
const BrandServices = {
  ...createCrudService({ resource: "brands" }),
  // Custom: getAllBrands takes a typed params object.
  // Note: the factory's `getAll` passes `params` straight to the request
  // helper, so we override here only because the backend expects query
  // params (not a structured response).
  getAllBrands: async ({
    name = "",
    status = "",
    page = "",
    limit = "",
    sort = "",
  } = {}) => {
    return requests.get(
      `/brands?name=${name ?? ""}&status=${status ?? ""}&page=${page ?? ""}&limit=${limit ?? ""}&sort=${sort ?? ""}`
    );
  },
};

export default BrandServices;
