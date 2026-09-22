const NoteService = require("../service/NoteService");

/**
 * Translate thrown errors into clean HTTP responses. The service throws
 * Error instances with a `.status` and `.code` property; we map them to a
 * uniform shape here so the route layer stays dumb.
 */
function handleError(err, res) {
  if (res.headersSent) return;
  const status = err.status || 500;
  const code = err.code || "NOTE_INTERNAL";
  const payload = { ok: false, code, message: err.message || "Internal error" };
  if (process.env.NODE_ENV !== "production" && status >= 500) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}

function pickAuthContext(req) {
  return req.authContext || req;
}

async function list(req, res) {
  try {
    const result = await NoteService.list(pickAuthContext(req), req.query || {});
    res.json({ ok: true, ...result });
  } catch (err) {
    handleError(err, res);
  }
}

async function getById(req, res) {
  try {
    const note = await NoteService.getById(
      pickAuthContext(req),
      req.params.id
    );
    res.json({ ok: true, data: note });
  } catch (err) {
    handleError(err, res);
  }
}

async function create(req, res) {
  try {
    const note = await NoteService.create(pickAuthContext(req), req.body || {});
    res.status(201).json({ ok: true, data: note });
  } catch (err) {
    handleError(err, res);
  }
}

async function update(req, res) {
  try {
    const note = await NoteService.update(
      pickAuthContext(req),
      req.params.id,
      req.body || {}
    );
    res.json({ ok: true, data: note });
  } catch (err) {
    handleError(err, res);
  }
}

async function softDelete(req, res) {
  try {
    const result = await NoteService.softDelete(
      pickAuthContext(req),
      req.params.id
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    handleError(err, res);
  }
}

async function setPinned(req, res) {
  try {
    const { pinned } = req.body || {};
    const note = await NoteService.setPinned(
      pickAuthContext(req),
      req.params.id,
      pinned
    );
    res.json({ ok: true, data: note });
  } catch (err) {
    handleError(err, res);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  softDelete,
  setPinned,
};
