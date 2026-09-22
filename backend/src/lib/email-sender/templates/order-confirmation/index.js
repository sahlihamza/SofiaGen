const escapeHtml = (value) =>
  String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const { formatMoney } = require("../../../../utils/formatMoney");

const money = (amount, currency) => {
  if (currency && typeof currency === "object") {
    return formatMoney(amount, currency);
  }
  const code = String(currency || "USD").toUpperCase().trim();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(Number(amount || 0));
};

const addressBlock = (address) => {
  if (!address) return "";

  return [
    address.name,
    address.company,
    address.address,
    [address.zipCode, address.city].filter(Boolean).join(" "),
    address.country,
    address.contact,
  ]
    .filter(Boolean)
    .map((line) => `<p style="margin:0;">${escapeHtml(line)}</p>`)
    .join("");
};

const totalRow = (label, value, { bold = false, color = "#111827" } = {}) => `
  <tr>
    <td style="padding:4px 8px;font-size:13px;color:#6b7280;">${escapeHtml(label)}</td>
    <td style="padding:4px 8px;font-size:13px;text-align:right;color:${color};${
      bold ? "font-weight:700;font-size:15px;" : ""
    }">${escapeHtml(value)}</td>
  </tr>`;

/**
 * Confirmation sent to the customer the moment an order is placed. Kept
 * self-contained (inline styles, no images) so it renders the same everywhere,
 * and deliberately separate from the invoice mail, which is sent later with
 * the PDF attached.
 *
 * @param {object} option
 * @param {string} option.orderNumber
 * @param {string} option.date
 * @param {string} option.currency
 * @param {Array<{name, quantity, unitPrice, lineTotal}>} option.items
 */
const orderConfirmationEmailBody = (option) => {
  const currency = option.currency || "";

  return `<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(option.heading || "Order confirmation")}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f2f3f8;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:24px 12px;">
      <div style="background:#ffffff;border-radius:8px;padding:24px;">
        <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">
          ${escapeHtml(option.heading || "Merci pour votre commande !")}
        </h1>
        <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
          ${escapeHtml(option.intro || "Votre commande a bien t enregistrée.")}
        </p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tbody>
            <tr>
              <td style="padding:8px;background:#f9fafb;font-size:13px;color:#6b7280;">Commande</td>
              <td style="padding:8px;background:#f9fafb;font-size:13px;font-weight:700;color:#111827;">
                ${escapeHtml(option.orderNumber)}
              </td>
            </tr>
            <tr>
              <td style="padding:8px;font-size:13px;color:#6b7280;">Date</td>
              <td style="padding:8px;font-size:13px;color:#111827;">${escapeHtml(option.date)}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f9fafb;font-size:13px;color:#6b7280;">Paiement</td>
              <td style="padding:8px;background:#f9fafb;font-size:13px;color:#111827;">
                ${escapeHtml(option.paymentMethod)}
              </td>
            </tr>
            ${
              option.shippingMethod
                ? `<tr>
              <td style="padding:8px;font-size:13px;color:#6b7280;">Livraison</td>
              <td style="padding:8px;font-size:13px;color:#111827;">${escapeHtml(
                option.shippingMethod
              )}</td>
            </tr>`
                : ""
            }
            ${
              option.estimatedDelivery
                ? `<tr>
              <td style="padding:8px;background:#f9fafb;font-size:13px;color:#6b7280;">Livraison estimé</td>
              <td style="padding:8px;background:#f9fafb;font-size:13px;color:#111827;">${escapeHtml(
                option.estimatedDelivery
              )}</td>
            </tr>`
                : ""
            }
          </tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Produit</th>
              <th style="padding:8px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Qté</th>
              <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(option.items || [])
              .map(
                (item) => `
            <tr>
              <td style="padding:8px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">
                ${escapeHtml(item.name)}
                <span style="display:block;color:#9ca3af;font-size:12px;">${money(
                  item.unitPrice,
                  currency
                )}</span>
              </td>
              <td style="padding:8px;font-size:13px;text-align:center;color:#111827;border-bottom:1px solid #f3f4f6;">
                ${escapeHtml(item.quantity)}
              </td>
              <td style="padding:8px;font-size:13px;text-align:right;color:#111827;border-bottom:1px solid #f3f4f6;">
                ${money(item.lineTotal, currency)}
              </td>
            </tr>`
              )
              .join("")}
          </tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tbody>
            ${totalRow("Sous-total", money(option.subTotal, currency))}
            ${totalRow("Livraison", money(option.shippingCost, currency))}
            ${
              Number(option.discount) > 0
                ? totalRow(
                    option.couponCode ? `Remise (${option.couponCode})` : "Remise",
                    `-${money(option.discount, currency)}`,
                    { color: "#f97316" }
                  )
                : ""
            }
            ${
              Number(option.tax) > 0
                ? totalRow(`TVA (${option.taxRate}%)`, money(option.tax, currency))
                : ""
            }
            ${totalRow("Total", money(option.total, currency), { bold: true })}
          </tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr>
              <td style="vertical-align:top;width:50%;padding-right:8px;font-size:13px;color:#374151;">
                <p style="margin:0 0 4px;font-weight:700;color:#111827;">Adresse de livraison</p>
                ${addressBlock(option.shippingAddress)}
              </td>
              <td style="vertical-align:top;width:50%;padding-left:8px;font-size:13px;color:#374151;">
                <p style="margin:0 0 4px;font-weight:700;color:#111827;">Adresse de facturation</p>
                ${addressBlock(option.billingAddress || option.shippingAddress)}
              </td>
            </tr>
          </tbody>
        </table>

        ${
          option.instructions
            ? `<p style="margin:20px 0 0;padding:12px;background:#ecfdf5;border-radius:6px;font-size:13px;color:#065f46;">
                ${escapeHtml(option.instructions)}
               </p>`
            : ""
        }
      </div>

      <p style="text-align:center;font-size:11px;color:#8a8a8a;margin-top:16px;">
        ${escapeHtml(option.company_name || "")}
        ${option.company_email ? ` &middot; ${escapeHtml(option.company_email)}` : ""}
      </p>
    </div>
  </body>
</html>`;
};

module.exports = orderConfirmationEmailBody;
