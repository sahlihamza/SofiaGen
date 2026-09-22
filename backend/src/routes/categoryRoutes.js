const express = require('express');
const { isAuth, loadUser, resolveAuthorizationContext } = require('../middleware/auth');
const router = express.Router();
const {
  addCategory,
  addAllCategory,
  getAllCategory,
  getAllCategories,
  getShowingCategory,
  getCategoryById,
  updateCategory,
  updateStatus,
  deleteCategory,
  deleteManyCategory,
  updateManyCategory

} = require('../controller/categoryController');

// SFG-80: was gated by a blanket isAuth at the mount in routes.js, which
// also blocked /show  the public storefront's category list, called with
// no login at all. Same fix as productRoutes.js: only the admin-management
// routes need auth now.
const adminAuth = [isAuth, loadUser, resolveAuthorizationContext];

//add a category
router.post('/add', ...adminAuth, addCategory);

//add all category
router.post('/add/all', ...adminAuth, addAllCategory);

// --- Public storefront browsing ---

//get only showing category
router.get('/show', getShowingCategory);

// --- Back to admin-only ---

//get all category
router.get('/', ...adminAuth, getAllCategory);
//get all category
router.get('/all', ...adminAuth, getAllCategories);

//get a category
router.get('/:id', ...adminAuth, getCategoryById);

//update a category
router.put('/:id', ...adminAuth, updateCategory);

//show/hide a category
router.put('/status/:id', ...adminAuth, updateStatus);

//delete a category
router.delete('/:id', ...adminAuth, deleteCategory);

// delete many category
router.patch('/delete/many', ...adminAuth, deleteManyCategory);

// update many category
router.patch('/update/many', ...adminAuth, updateManyCategory);

module.exports = router;
