const DEFAULT_EMAIL_NOTIFICATIONS = [
  {
    key: "new_order",
    title: "New order",
    description: "Sent to the store admin when a new order is received.",
    enabled: true,
    contentType: "html",
    recipientType: "admin",
    recipients: "",
    subject: "[{store_name}] New order #{order_number}",
    heading: "New order: #{order_number}",
    additionalContent: "Congrats on the sale!",
    cc: "",
    bcc: "",
    order: 0,
  },
  {
    key: "cancelled_order",
    title: "Cancelled order",
    description: "Sent to the store admin when an order is cancelled.",
    enabled: true,
    contentType: "html",
    recipientType: "admin",
    recipients: "",
    subject: "[{store_name}] Order #{order_number} has been cancelled",
    heading: "Order cancelled: #{order_number}",
    order: 1,
  },
  {
    key: "failed_order",
    title: "Failed order",
    description: "Sent to the store admin when an order payment fails.",
    enabled: true,
    contentType: "html",
    recipientType: "admin",
    recipients: "",
    subject: "[{store_name}] Order #{order_number} has failed",
    heading: "Order failed: #{order_number}",
    order: 2,
  },
  {
    key: "order_on_hold",
    title: "Order on-hold",
    description:
      "Sent to the customer when an order is placed on hold awaiting payment.",
    enabled: true,
    contentType: "html",
    recipientType: "customer",
    recipients: "",
    subject: "Your {store_name} order has been received!",
    heading: "Thank you for your order",
    order: 3,
  },
  {
    key: "processing_order",
    title: "Processing order",
    description:
      "Sent to the customer when payment is confirmed and the order is being processed.",
    enabled: true,
    contentType: "html",
    recipientType: "customer",
    recipients: "",
    subject: "Your {store_name} order is being processed",
    heading: "Thank you for your order",
    order: 4,
  },
  {
    key: "completed_order",
    title: "Completed order",
    description:
      "Sent to the customer when the order is marked complete, usually indicating it has been shipped.",
    enabled: true,
    contentType: "html",
    recipientType: "customer",
    recipients: "",
    subject: "Your {store_name} order is now complete",
    heading: "Your order is complete",
    order: 5,
  },
  {
    key: "refunded_order",
    title: "Refunded order",
    description: "Sent to the customer when an order is refunded.",
    enabled: true,
    contentType: "html",
    recipientType: "customer",
    recipients: "",
    subject: "Your {store_name} order has been refunded",
    heading: "Your order has been refunded",
    order: 6,
  },
  {
    key: "customer_invoice",
    title: "Customer invoice / Order details",
    description:
      "Sent to the customer containing order information and payment links.",
    enabled: true,
    contentType: "html",
    recipientType: "customer",
    recipients: "",
    subject: "Invoice for {store_name} order #{order_number}",
    heading: "Invoice for order #{order_number}",
    order: 7,
  },
  {
    key: "customer_note",
    title: "Customer note",
    description: "Sent to the customer when a note is added to their order.",
    enabled: true,
    contentType: "html",
    recipientType: "customer",
    recipients: "",
    subject: "A note has been added to your {store_name} order",
    heading: "A note has been added to your order",
    order: 8,
  },
  {
    key: "reset_password",
    title: "Reset password",
    description:
      "Sent to the customer when they request a password reset.",
    enabled: true,
    contentType: "html",
    recipientType: "customer",
    recipients: "",
    subject: "Password reset request for {store_name}",
    heading: "Password reset request",
    order: 9,
  },
  {
    key: "new_account",
    title: "New account",
    description:
      "Sent to the customer when they create a new account on the store.",
    enabled: true,
    contentType: "html",
    recipientType: "customer",
    recipients: "",
    subject: "Your {store_name} account has been created!",
    heading: "Welcome to {store_name}",
    order: 10,
  },
].map((notification) => ({
  additionalContent: "",
  cc: "",
  bcc: "",
  ...notification,
}));

const EMAIL_NOTIFICATION_KEYS = DEFAULT_EMAIL_NOTIFICATIONS.map(
  (notification) => notification.key
);

const DEFAULT_EMAIL_TEMPLATE = {
  fromName: "",
  fromEmail: "",
  emailInsightsEnabled: true,
  logo: "",
  logoWidth: 120,
  headerAlignment: "left",
  fontFamily: "Helvetica",
  footerText: "{store_name} - Built with SofiaGen",
  baseColor: "#720eec",
  backgroundColor: "#f7f7f7",
  bodyBackgroundColor: "#ffffff",
  bodyTextColor: "#3c3c3c",
  secondaryTextColor: "#6b7280",
  syncWithTheme: true,
};

const EMAIL_TEMPLATE_FONT_FAMILIES = [
  "Helvetica",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Courier New",
];

// Replaces {placeholder} tokens (e.g. {store_name}, {order_number}) in a
// subject/heading template. Unknown placeholders are left as-is.
const renderEmailPlaceholders = (template, vars = {}) =>
  (template || "").replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : match
  );

// Fake order used to render the live preview in the admin settings page, so
// store owners can see roughly what the email will look like without having
// a real order handy.
const getSampleOrderPreviewData = () => ({
  order_number: "12345",
  customer_name: "John Doe",
  date: new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  items: [
    { name: "Produit fictif", meta: "", qty: 2, price: 50000 },
    { name: "Variante de produit fictive", meta: "Bleu / M", qty: 1, price: 20000 },
    { name: "Produit téléchargeable fictif", meta: "", qty: 1, price: 15000 },
  ],
  subtotal: 85000,
  discount: 10000,
  shipping: 5000,
  total: 80000,
  billingAddress: {
    name: "John Doe",
    line1: "12 Rue de la Paix",
    city: "Casablanca 20000",
    country: "Maroc",
    email: "john.doe@example.com",
    phone: "+212 600 000 000",
  },
  shippingAddress: {
    name: "John Doe",
    line1: "12 Rue de la Paix",
    city: "Casablanca 20000",
    country: "Maroc",
  },
});

const formatPreviewAmount = (amount, currencySymbol = "$") =>
  `${currencySymbol}${Number(amount || 0).toLocaleString("en-US")}`;

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "",
  GBP: "",
  MAD: "DH",
  CAD: "$",
  AUD: "$",
};

const getCurrencySymbol = (currencyCode) =>
  CURRENCY_SYMBOLS[currencyCode] || currencyCode || "$";

const ALIGNMENT_MAP = { left: "left", center: "center", right: "right" };

// Renders a full standalone HTML document for a notification, mixing the
// store's template (logo/font/footer) with the notification's own
// subject/heading/additionalContent and a fake order so it can be previewed
// or sent as a test email before any real order exists.
const renderNotificationPreviewHtml = ({
  notification,
  template = DEFAULT_EMAIL_TEMPLATE,
  storeName = "Ma Boutique",
  currencySymbol = "$",
}) => {
  const sample = getSampleOrderPreviewData();
  const vars = {
    store_name: storeName,
    order_number: sample.order_number,
    current_year: new Date().getFullYear(),
  };

  const heading = renderEmailPlaceholders(notification.heading, vars);
  const additionalContent = renderEmailPlaceholders(
    notification.additionalContent,
    vars
  );
  const footerText = renderEmailPlaceholders(template.footerText, vars);
  const fontFamily = template.fontFamily || DEFAULT_EMAIL_TEMPLATE.fontFamily;
  const align = ALIGNMENT_MAP[template.headerAlignment] || "left";
  const logoWidth = template.logoWidth || DEFAULT_EMAIL_TEMPLATE.logoWidth;

  // When "sync with theme" is on, the palette always follows the platform
  // defaults instead of the store's saved custom colors  same behavior as
  // WooCommerce's palette sync toggle.
  const syncWithTheme = template.syncWithTheme !== false;
  const palette = syncWithTheme ? DEFAULT_EMAIL_TEMPLATE : template;

  const baseColor = palette.baseColor || DEFAULT_EMAIL_TEMPLATE.baseColor;
  const backgroundColor =
    palette.backgroundColor || DEFAULT_EMAIL_TEMPLATE.backgroundColor;
  const bodyBackgroundColor =
    palette.bodyBackgroundColor || DEFAULT_EMAIL_TEMPLATE.bodyBackgroundColor;
  const bodyTextColor =
    palette.bodyTextColor || DEFAULT_EMAIL_TEMPLATE.bodyTextColor;
  const secondaryTextColor =
    palette.secondaryTextColor || DEFAULT_EMAIL_TEMPLATE.secondaryTextColor;

  const introByKey = {
    new_order: `Vous avez reçu une nouvelle commande de ${sample.customer_name} :`,
    cancelled_order: `La commande #${sample.order_number} a t annulée.`,
    failed_order: `Le paiement de la commande #${sample.order_number} a échoué.`,
    order_on_hold: `Merci pour votre commande, elle est actuellement en attente de confirmation.`,
    processing_order: `Merci pour votre commande. Voici son résumé :`,
    completed_order: `Votre commande a t expédié. Voici son résumé :`,
    refunded_order: `Votre commande #${sample.order_number} a t remboursé.`,
    customer_invoice: `Voici le récapitulatif de votre commande #${sample.order_number} :`,
    customer_note: `Une note a t ajouté à votre commande #${sample.order_number}.`,
    reset_password: `Vous avez demandé une réinitialisation de votre mot de passe.`,
    new_account: `Merci de nous avoir rejoint. Voici les informations de votre compte.`,
  };

  const showOrderSummary = ![
    "reset_password",
    "new_account",
  ].includes(notification.key);

  const itemsHtml = sample.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0; border-bottom:1px solid #f1f1f1;">
            ${item.name}${item.meta ? `<br/><small style="color:${secondaryTextColor};">${item.meta}</small>` : ""}
          </td>
          <td style="padding:8px 0; border-bottom:1px solid #f1f1f1; text-align:center;">${item.qty}</td>
          <td style="padding:8px 0; border-bottom:1px solid #f1f1f1; text-align:right;">${formatPreviewAmount(item.price, currencySymbol)}</td>
        </tr>`
    )
    .join("");

  const orderSummaryHtml = showOrderSummary
    ? `
    <h3 style="margin:24px 0 8px; font-size:15px; color:${bodyTextColor};">Résumé de la commande</h3>
    <p style="margin:0 0 12px; font-size:13px; color:${secondaryTextColor};">Commande né${sample.order_number} (${sample.date})</p>
    <table style="width:100%; border-collapse:collapse; font-size:14px; color:${bodyTextColor};">
      <thead>
        <tr>
          <th style="text-align:left; padding-bottom:8px; border-bottom:2px solid ${baseColor};">Produit</th>
          <th style="text-align:center; padding-bottom:8px; border-bottom:2px solid ${baseColor};">Quantité</th>
          <th style="text-align:right; padding-bottom:8px; border-bottom:2px solid ${baseColor};">Prix</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <table style="width:100%; margin-top:12px; font-size:14px; color:${bodyTextColor};">
      <tr><td>Sous-total :</td><td style="text-align:right;">${formatPreviewAmount(sample.subtotal, currencySymbol)}</td></tr>
      <tr><td>Remise :</td><td style="text-align:right;">-${formatPreviewAmount(sample.discount, currencySymbol)}</td></tr>
      <tr><td>Expédition :</td><td style="text-align:right;">${formatPreviewAmount(sample.shipping, currencySymbol)}</td></tr>
      <tr style="font-weight:bold; color:${baseColor};"><td>Total :</td><td style="text-align:right;">${formatPreviewAmount(sample.total, currencySymbol)}</td></tr>
    </table>
    <table style="width:100%; margin-top:24px; border-collapse:collapse; font-size:13px; color:${bodyTextColor};">
      <tr>
        <td style="width:50%; vertical-align:top; padding-right:12px;">
          <h4 style="margin:0 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:${secondaryTextColor}; border-bottom:1px solid #e5e7eb; padding-bottom:6px;">Adresse de facturation</h4>
          <p style="margin:0; line-height:1.5;">
            ${sample.billingAddress.name}<br/>
            ${sample.billingAddress.line1}<br/>
            ${sample.billingAddress.city}<br/>
            ${sample.billingAddress.country}<br/>
            ${sample.billingAddress.email}<br/>
            ${sample.billingAddress.phone}
          </p>
        </td>
        <td style="width:50%; vertical-align:top; padding-left:12px;">
          <h4 style="margin:0 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:${secondaryTextColor}; border-bottom:1px solid #e5e7eb; padding-bottom:6px;">Adresse de livraison</h4>
          <p style="margin:0; line-height:1.5;">
            ${sample.shippingAddress.name}<br/>
            ${sample.shippingAddress.line1}<br/>
            ${sample.shippingAddress.city}<br/>
            ${sample.shippingAddress.country}
          </p>
        </td>
      </tr>
    </table>`
    : "";

  const additionalContentHtml = additionalContent
    ? `<p style="margin:20px 0 0; color:${bodyTextColor};">${additionalContent.replace(/\n/g, "<br/>")}</p>`
    : "";

  return `
    <div style="background:${backgroundColor}; padding:24px 0; font-family:${fontFamily}, Arial, sans-serif;">
      <div style="max-width:560px; margin:0 auto; padding:24px; background:${bodyBackgroundColor}; border-top:4px solid ${baseColor}; border-radius:8px; color:${bodyTextColor};">
        <div style="text-align:${align}; margin-bottom:16px;">
          ${
            template.logo
              ? `<img src="${template.logo}" alt="${storeName}" style="width:${logoWidth}px; max-width:100%;" />`
              : `<span style="font-weight:bold; font-size:18px; color:${baseColor};">${storeName}</span>`
          }
        </div>
        <h2 style="color:${baseColor}; margin:0 0 12px;">${heading}</h2>
        <p style="margin:0 0 4px;">${introByKey[notification.key] || ""}</p>
        ${orderSummaryHtml}
        ${additionalContentHtml}
        <p style="margin-top:24px; padding-top:16px; border-top:1px solid #eee; color:${secondaryTextColor}; font-size:12px;">${footerText}</p>
      </div>
    </div>
  `;
};

module.exports = {
  DEFAULT_EMAIL_NOTIFICATIONS,
  EMAIL_NOTIFICATION_KEYS,
  DEFAULT_EMAIL_TEMPLATE,
  EMAIL_TEMPLATE_FONT_FAMILIES,
  renderEmailPlaceholders,
  getSampleOrderPreviewData,
  renderNotificationPreviewHtml,
  getCurrencySymbol,
};
