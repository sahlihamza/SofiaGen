// The upload endpoint returns an absolute URL (http://host:port/static/<folder>/<file>)
// for the browser to load right away, but we only ever want to persist the relative
// path in the DB so images stay valid across environments (dev/staging/prod, ports).
const normalizeImagePath = (image) => {
  if (!image) return image;
  const match = String(image).match(/\/static\/(.+)$/);
  return match ? match[1] : image;
};

module.exports = { normalizeImagePath };
