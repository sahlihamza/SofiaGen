import requests from './httpService';

// One-to-many: an Attribute owns many AttributeValue documents (its "terms").
// Backend is mounted at /api/attribute-values/.
const AttributeValueServices = {
  // All values that belong to an attribute, ordered for display
  getValuesByAttribute: async (attributeId) => {
    return requests.get(`/attribute-values/attribute/${attributeId}`);
  },

  addValue: async (body) => {
    return requests.post('/attribute-values/add', body);
  },

  getValueById: async (id) => {
    return requests.get(`/attribute-values/${id}`);
  },

  updateValue: async (id, body) => {
    return requests.put(`/attribute-values/${id}`, body);
  },

  deleteValue: async (id) => {
    return requests.delete(`/attribute-values/${id}`);
  },

  // Replace the full set of values for an attribute in one call
  setAttributeValues: async (attributeId, body) => {
    return requests.put(`/attribute-values/attribute/${attributeId}`, body);
  },
};

export default AttributeValueServices;
