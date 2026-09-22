/**
 * asyncHandler  wraps an async Express handler so any thrown / rejected
 * error is forwarded to the next middleware (the shared errorMiddleware
 * in `app.js`). Eliminates the `try { ... } catch (err) { logger.error;
 * res.status(500).send(...) }` boilerplate repeated in 100+ controllers.
 *
 * Usage:
 *   const addCategory = asyncHandler(async (req, res) => {
 *     await Category.create(req.body);
 *     res.status(200).json({ message: "Category Added Successfully!" });
 *   });
 *
 * Errors thrown by the handler are normalised: any error with a `status`
 * property is honoured; anything else becomes a 500.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
