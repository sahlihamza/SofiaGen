import requests from "./httpService";
import { createCrudService } from "./createCrudService";

const AttributeServices = {
  ...createCrudService({ resource: "attributes" }),
  // Custom: getAllAttributes takes a params object (name, isVariation, page, limit)
  getAllAttributes: async (params = {}) => {
    return requests.get("/attributes", params);
  },
};

export default AttributeServices;
