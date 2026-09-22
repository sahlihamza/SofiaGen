const Category = require("../models/Category");
const asyncHandler = require("../lib/asyncHandler");

const addCategory = asyncHandler(async (req, res) => {
  const newCategory = new Category(req.body);
  await newCategory.save();
  res.status(200).send({ message: "Category Added Successfully!" });
});

// all multiple category
const addAllCategory = asyncHandler(async (req, res) => {
  await Category.deleteMany();
  await Category.insertMany(req.body);
  res.status(200).send({ message: "Category Added Successfully!" });
});

// get status show category
const getShowingCategory = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: "show" }).sort({ _id: -1 });
  const categoryList = readyToParentAndChildrenCategory(categories);
  res.send(categoryList);
});

// get all category parent and child
const getAllCategory = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ _id: -1 });
  const categoryList = readyToParentAndChildrenCategory(categories);
  res.send(categoryList);
});

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ _id: -1 });
  res.send(categories);
});

const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  res.send(category);
});

// category update
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (category) {
    category.name = { ...category.name, ...req.body.name };
    category.description = { ...category.description, ...req.body.description };
    category.icon = req.body.icon;
    category.status = req.body.status;
    category.parentId = req.body.parentId ? req.body.parentId : category.parentId;
    category.parentName = req.body.parentName;

    await category.save();
    res.send({ message: "Category Updated Successfully!" });
  }
});

// udpate many category
const updateManyCategory = asyncHandler(async (req, res) => {
  const updatedData = {};
  for (const key of Object.keys(req.body)) {
    if (
      req.body[key] !== "[]" &&
      Object.entries(req.body[key]).length > 0 &&
      req.body[key] !== req.body.ids
    ) {
      updatedData[key] = req.body[key];
    }
  }

  await Category.updateMany({ _id: { $in: req.body.ids } }, { $set: updatedData }, { multi: true });

  res.send({ message: "Categories update successfully!" });
});

// category update status
const updateStatus = asyncHandler(async (req, res) => {
  const newStatus = req.body.status;
  await Category.updateOne({ _id: req.params.id }, { $set: { status: newStatus } });
  res.status(200).send({
    message: `Category ${newStatus === "show" ? "Published" : "Un-Published"} Successfully!`,
  });
});

// single category delete
const deleteCategory = asyncHandler(async (req, res) => {
  await Category.deleteOne({ _id: req.params.id });
  await Category.deleteMany({ parentId: req.params.id });
  res.status(200).send({ message: "Category Deleted Successfully!" });
});

// all multiple category delete
const deleteManyCategory = asyncHandler(async (req, res) => {
  await Category.deleteMany({ parentId: req.body.ids });
  await Category.deleteMany({ _id: req.body.ids });
  res.status(200).send({ message: "Categories Deleted Successfully!" });
});

const readyToParentAndChildrenCategory = (categories, parentId = null) => {
  const categoryList = [];
  let Categories;
  if (parentId == null) {
    Categories = categories.filter((cat) => cat.parentId == undefined);
  } else {
    Categories = categories.filter((cat) => cat.parentId == parentId);
  }

  for (let cate of Categories) {
    categoryList.push({
      _id: cate._id,
      name: cate.name,
      parentId: cate.parentId,
      parentName: cate.parentName,
      description: cate.description,
      icon: cate.icon,
      status: cate.status,
      children: readyToParentAndChildrenCategory(categories, cate._id),
    });
  }

  return categoryList;
};

module.exports = {
  addCategory,
  addAllCategory,
  getAllCategory,
  getShowingCategory,
  getCategoryById,
  updateCategory,
  updateStatus,
  deleteCategory,
  deleteManyCategory,
  getAllCategories,
  updateManyCategory,
};
