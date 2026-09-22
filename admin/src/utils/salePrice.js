// Sale scheduling rules, shared by every place that shows a product price.
//
// Regular price is always the fallback. A sale price only takes over while it
// is actually running:
//   - no schedule at all      -> the sale is always on
//   - before the start date   -> regular price
//   - inside the window       -> sale price
//   - after the end date      -> regular price again
//
// Both bounds are optional and inclusive: a start with no end runs forever
// from that day, an end with no start runs until that day. Dates are stored as
// YYYY-MM-DD, so comparing them as strings is the same as comparing the days
// and avoids dragging timezones into it.

const day = (value) => (value ? String(value).substring(0, 10) : "");

const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  // local calendar day, not UTC — a sale ends when the day ends for the user
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Is the sale price the one that should be charged right now?
export const isSaleActive = (product, now = today()) => {
  const sale = Number(product?.salePrice) || 0;
  if (sale <= 0) return false;

  const start = day(product?.saleStart);
  const end = day(product?.saleEnd);

  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
};

// The price actually charged today.
export const getEffectivePrice = (product) =>
  isSaleActive(product)
    ? Number(product.salePrice)
    : Number(product?.regularPrice) || 0;

// End must not fall before start. Returns true when the pair is acceptable —
// either bound may be empty. Kept here so the form and any future consumer
// agree on what "valid" means.
export const isValidSaleRange = (start, end) =>
  !start || !end || day(end) >= day(start);
