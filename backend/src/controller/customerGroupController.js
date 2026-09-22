const CustomerGroupService = require("../service/CustomerGroupService");

const addGroup = async (req, res) => {
  try {
    const group = await CustomerGroupService.createGroup(req.body);
    res.send({ data: group, message: "Customer group added successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const addAllGroups = async (req, res) => {
  try {
    await CustomerGroupService.createManyGroups(req.body);
    res.status(200).send({
      message: "Added all customer groups successfully!",
    });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getAllGroups = async (req, res) => {
  try {
    const result = await CustomerGroupService.getAllGroups(req.query);
    res.send(result);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getGroupById = async (req, res) => {
  try {
    const group = await CustomerGroupService.getGroupById(req.params.id);

    if (!group) {
      return res.status(404).send({ message: "Customer Group Not Found!" });
    }

    res.send(group);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const updateGroup = async (req, res) => {
  try {
    const group = await CustomerGroupService.updateGroup(
      req.params.id,
      req.body
    );

    if (!group) {
      return res.status(404).send({ message: "Customer Group Not Found!" });
    }

    res.send({ data: group, message: "Customer group updated successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await CustomerGroupService.deleteGroup(req.params.id);

    if (!group) {
      return res.status(404).send({ message: "Customer Group Not Found!" });
    }

    res.send({ message: "Customer Group Deleted Successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const deleteManyGroups = async (req, res) => {
  try {
    await CustomerGroupService.deleteManyGroups(req.body.ids);
    res.send({ message: "Customer Groups Deleted Successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const assignCustomersToGroup = async (req, res) => {
  try {
    await CustomerGroupService.assignCustomersToGroup(
      req.params.id,
      req.body.customerIds
    );
    res.send({ message: "Customers assigned successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addGroup,
  addAllGroups,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  deleteManyGroups,
  assignCustomersToGroup,
};
