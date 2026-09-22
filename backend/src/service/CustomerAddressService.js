const CustomerAddress = require("../models/CustomerAddress");
const Customer = require("../models/Customer");

const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const isSet = (value) => value !== undefined && value !== null && value !== "";

const WRITABLE_FIELDS = [
  "type",
  "firstName",
  "lastName",
  "company",
  "address1",
  "address2",
  "city",
  "state",
  "postalCode",
  "country",
  "phone",
];

const pickWritable = (data = {}) =>
  WRITABLE_FIELDS.reduce((acc, field) => {
    if (data[field] !== undefined) acc[field] = data[field];
    return acc;
  }, {});

const loadLiveCustomer = async (customerId) => {
  const customer = await Customer.findOne({ _id: customerId, deletedAt: null });
  if (!customer) {
    throw httpError(404, "Client introuvable.");
  }
  return customer;
};

// A customer keeps one default per address type: one default billing and one
// default shipping, like WooCommerce.
const clearOtherDefaults = async (address) => {
  await CustomerAddress.updateMany(
    {
      customerId: address.customerId,
      type: address.type,
      _id: { $ne: address._id },
    },
    { $set: { isDefault: false } }
  );
};

const countForType = async (customerId, type, excludeId) => {
  const query = { customerId, type };
  if (excludeId) query._id = { $ne: excludeId };
  return CustomerAddress.countDocuments(query);
};

const createAddress = async (data = {}) => {
  const customerId = data.customerId;
  if (!customerId) {
    throw httpError(400, "customerId est obligatoire.");
  }

  const customer = await loadLiveCustomer(customerId);

  const payload = pickWritable(data);
  payload.customerId = customer._id;
  // The address always lives in the same boutique as its customer.
  payload.storeId = customer.storeId;

  const address = new CustomerAddress(payload);

  // The very first address of a type is the default, whatever the caller sent.
  const existing = await countForType(customer._id, address.type, null);
  address.isDefault = existing === 0 ? true : data.isDefault === true;

  await address.save();

  if (address.isDefault) {
    await clearOtherDefaults(address);
  }

  return address;
};

const getAddressesByCustomer = async (customerId, { type, isDefault } = {}) => {
  const queryObject = { customerId };

  if (isSet(type)) queryObject.type = type;
  if (isSet(isDefault)) {
    queryObject.isDefault = isDefault === true || isDefault === "true";
  }

  // Defaults first, then newest.
  return CustomerAddress.find(queryObject).sort({ isDefault: -1, _id: -1 });
};

const getAddressById = async (id) => {
  return CustomerAddress.findById(id);
};

const getDefaultAddress = async (customerId, type = "shipping") => {
  return CustomerAddress.findOne({ customerId, type, isDefault: true });
};

const updateAddress = async (id, data = {}) => {
  const address = await CustomerAddress.findById(id);
  if (!address) return null;

  Object.assign(address, pickWritable(data));

  // Changing the type can leave the new type with no default at all.
  if (data.isDefault === true) {
    address.isDefault = true;
  } else if (
    (await countForType(address.customerId, address.type, address._id)) === 0
  ) {
    address.isDefault = true;
  } else if (data.isDefault === false) {
    address.isDefault = false;
  }

  await address.save();

  if (address.isDefault) {
    await clearOtherDefaults(address);
  }

  return address;
};

const setDefaultAddress = async (id) => {
  const address = await CustomerAddress.findById(id);
  if (!address) return null;

  address.isDefault = true;
  await address.save();
  await clearOtherDefaults(address);

  return address;
};

const deleteAddress = async (id) => {
  const address = await CustomerAddress.findById(id);
  if (!address) return null;

  await CustomerAddress.deleteOne({ _id: address._id });

  // Never leave a type without a default: promote the most recent sibling.
  if (address.isDefault) {
    const replacement = await CustomerAddress.findOne({
      customerId: address.customerId,
      type: address.type,
    }).sort({ _id: -1 });

    if (replacement) {
      replacement.isDefault = true;
      await replacement.save();
    }
  }

  return address;
};

// Called when a customer is permanently erased.
const deleteAddressesByCustomer = async (customerId) => {
  return CustomerAddress.deleteMany({ customerId });
};

module.exports = {
  createAddress,
  getAddressesByCustomer,
  getAddressById,
  getDefaultAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  deleteAddressesByCustomer,
};
