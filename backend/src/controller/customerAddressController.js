const CustomerAddressService = require("../service/CustomerAddressService");

const addAddress = async (req, res) => {
  try {
    const address = await CustomerAddressService.createAddress(req.body);
    res.send({ data: address, message: "Address added successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getAddressesByCustomer = async (req, res) => {
  try {
    const addresses = await CustomerAddressService.getAddressesByCustomer(
      req.params.customerId,
      req.query
    );
    res.send(addresses);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getDefaultAddress = async (req, res) => {
  try {
    const address = await CustomerAddressService.getDefaultAddress(
      req.params.customerId,
      req.query.type
    );

    if (!address) {
      return res.status(404).send({ message: "Default Address Not Found!" });
    }

    res.send(address);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getAddressById = async (req, res) => {
  try {
    const address = await CustomerAddressService.getAddressById(req.params.id);

    if (!address) {
      return res.status(404).send({ message: "Address Not Found!" });
    }

    res.send(address);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const address = await CustomerAddressService.updateAddress(
      req.params.id,
      req.body
    );

    if (!address) {
      return res.status(404).send({ message: "Address Not Found!" });
    }

    res.send({ data: address, message: "Address updated successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const address = await CustomerAddressService.setDefaultAddress(
      req.params.id
    );

    if (!address) {
      return res.status(404).send({ message: "Address Not Found!" });
    }

    res.send({ data: address, message: "Default address set successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const address = await CustomerAddressService.deleteAddress(req.params.id);

    if (!address) {
      return res.status(404).send({ message: "Address Not Found!" });
    }

    res.send({ message: "Address Deleted Successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addAddress,
  getAddressesByCustomer,
  getDefaultAddress,
  getAddressById,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
};
