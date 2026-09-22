const Order = require("../models/Order");
const Notification = require("../models/Notification");
const { emitEvent } = require("../lib/eventBus");
const notificationService = require("./notificationService");
const CustomerAddress = require("../models/CustomerAddress");
const GeneralSettings = require("../models/GeneralSettings");
const Country = require("../models/Country");
const logger = require("../config/logger");

const { formatMoney } = require("../utils/formatMoney");
const { isOfflinePaymentMethod } = require("../utils/paymentMethods");
const {
  renderEmailPlaceholders,
} = require("../utils/emailNotifications");

const paymentSettingsService = require("./paymentSettingsService");
const checkoutPaymentService = require("./checkoutPaymentService");
const StorePaymentProvider = require("../models/payment/StorePaymentProvider");
const emailSettingsService = require("./emailSettingsService");
const shippingRateService = require("./shippingRateService");
const checkoutCartService = require("./checkoutCartService");
const checkoutTaxService = require("./checkoutTaxService");
const stockReservationService = require("./stockReservationService");
const paymentGatewayService = require("./paymentGatewayService");
const orderItemService = require("./orderItemService");
const orderStatusHistoryService = require("./orderStatusHistoryService");
const SoftLimitService = require("./SoftLimitService");
const StoreUsageService = require("./StoreUsageService");
const paymentService = require("./paymentService");
const couponValidationService = require("./couponValidationService");
const couponCalculationService = require("./couponCalculationService");
const couponUsageService = require("./couponUsageService");

const EmailService = require("./email/EmailService");
const orderConfirmationEmailBody = require("../lib/email-sender/templates/order-confirmation");

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const ENCRYPTED_CONFIG_KEYS = /secret|password|passphrase|private|token|webhook|api[_-]?key/i;

const enrichMethodWithCredentials = async (storeId, method) => {
  if (!method || isOfflinePaymentMethod(method.key)) {
    return method;
  }

  const storeProviders = await StorePaymentProvider.find({
    storeId,
    enabled: true,
  }).populate('providerId', 'code name type').lean();

  if (!storeProviders.length) {
    return method;
  }

  const methodKey = method.key;
  const storeProvider = storeProviders.find((sp) => {
    const code = sp.providerId?.code;
    return code === methodKey || (methodKey === 'woopayments' && code === 'stripe');
  });

  if (!storeProvider) {
    return method;
  }

  const enriched = { ...method };

  if (storeProvider.credentials) {
    const credentialEntries = Object.entries(storeProvider.credentials).filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    );

    for (const [key, value] of credentialEntries) {
      if (ENCRYPTED_CONFIG_KEYS.test(key)) {
        continue;
      }
      if (!enriched.config) enriched.config = {};
      if (enriched.config[key] === undefined || enriched.config[key] === '') {
        enriched.config[key] = value;
      }
    }
  }

  if (storeProvider.settings) {
    enriched.config = {
      ...enriched.config,
      ...Object.fromEntries(
        Object.entries(storeProvider.settings).filter(([, value]) => value !== null && value !== undefined && value !== '')
      ),
    };
  }

  return enriched;
};

// Le pays n'y figure volontairement pas : il est facultatif au checkout. Sans
// lui, findZoneForAddress retombe sur la zone par défaut de la boutique, et le
// contrôle COUNTRY_NOT_SHIPPED ne s'applique qu'aux adresses qui en portent un.
const REQUIRED_ADDRESS_FIELDS = [
  ["firstName", "le prénom"],
  ["address1", "l'adresse"],
  ["city", "la ville"],
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --------------------------------------------------------------------------
// Addresses
// --------------------------------------------------------------------------

// Checkout accepts either a saved address (`{ addressId }`) or a brand new one
// typed into the form. A saved id is always re-read from the database and
// checked against the logged-in customer, so an id belonging to somebody else
// can never be used.
const resolveAddress = async (input, { customer, type }) => {
  if (!input) return null;

  if (input.addressId) {
    if (!customer) return null;

    const saved = await CustomerAddress.findOne({
      _id: input.addressId,
      customerId: customer._id,
    });
    if (!saved) return null;

    return {
      firstName: saved.firstName,
      lastName: saved.lastName,
      company: saved.company,
      address1: saved.address1,
      address2: saved.address2,
      city: saved.city,
      state: saved.state,
      postalCode: saved.postalCode,
      country: saved.country,
      phone: saved.phone,
      email: input.email || customer.email,
      addressId: String(saved._id),
      type: saved.type || type,
    };
  }

  return {
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company,
    address1: input.address1,
    address2: input.address2,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country,
    phone: input.phone,
    email: input.email,
    saveAddress: !!input.saveAddress,
    type,
  };
};

const validateAddress = (address, { label, field, requireEmail = false }) => {
  const errors = [];

  if (!address) {
    errors.push({
      code: "ADDRESS_REQUIRED",
      field,
      message: `${label} est obligatoire.`,
    });
    return errors;
  }

  for (const [key, humanName] of REQUIRED_ADDRESS_FIELDS) {
    if (!String(address[key] || "").trim()) {
      errors.push({
        code: "ADDRESS_INCOMPLETE",
        field: `${field}.${key}`,
        message: `${label} : ${humanName} est obligatoire.`,
      });
    }
  }

  if (requireEmail && !EMAIL_PATTERN.test(String(address.email || "").trim())) {
    errors.push({
      code: "EMAIL_INVALID",
      field: `${field}.email`,
      message: "Une adresse e-mail valide est obligatoire.",
    });
  }

  return errors;
};

// The Order model stores addresses flat (legacy `user_info` shape read by the
// invoice and the emails).
const toOrderInfo = (address) => {
  if (!address) return undefined;

  return {
    name: [address.firstName, address.lastName].filter(Boolean).join(" ").trim(),
    email: address.email || "",
    // Same value under both names: `contact` is what the storefront and the
    // e-mails read, `phone` what the invoice PDF template reads.
    contact: address.phone || "",
    phone: address.phone || "",
    address: [address.address1, address.address2].filter(Boolean).join(", "),
    city: address.city || "",
    country: address.country || "",
    zipCode: address.postalCode || "",
    company: address.company || "",
    state: address.state || "",
  };
};

// --------------------------------------------------------------------------
// Store configuration
// --------------------------------------------------------------------------

const loadStoreConfig = async (storeId) => {
  const [generalSettings, paymentContext] = await Promise.all([
    GeneralSettings.findOne({ storeId })
      .populate("currencyId")
      .populate("shippingCountries"),
    checkoutPaymentService.getCheckoutPaymentContext(storeId),
  ]);

  return { generalSettings, enabledMethods: paymentContext.enabledMethods };
};

// An empty `shippingCountries` conventionally means "everywhere", so the whole
// country list is offered. Otherwise only the countries the store ships to.
const shippingCountriesFor = async (generalSettings) => {
  const configured = generalSettings?.shippingCountries || [];
  const countries = configured.length
    ? configured
    : await Country.find().sort({ name: 1 });

  return countries.map((country) => ({
    id: String(country._id),
    name: country.name,
    iso2: country.iso2,
  }));
};

const shipsToCountry = (generalSettings, country) => {
  const configured = generalSettings?.shippingCountries || [];
  if (configured.length === 0) return true;

  const value = String(country || "").trim().toUpperCase();

  return configured.some(
    (candidate) =>
      String(candidate.name || "").toUpperCase() === value ||
      String(candidate.iso2 || "").toUpperCase() === value ||
      String(candidate.iso3 || "").toUpperCase() === value
  );
};

// --------------------------------------------------------------------------
// Pricing
// --------------------------------------------------------------------------

const applyCoupon = async (couponCode, { storeId, customer, cart, shippingAddress }) => {
  if (!couponCode) return { coupon: null, discount: 0, freeShipping: false, errors: [] };

  const context = {
    storeId,
    customerId: customer?._id,
    isGuest: !customer,
    cartItems: checkoutCartService.toCouponCartItems(cart.lines),
    cartSubtotal: cart.subtotal,
    cartTotalWeight: cart.totalWeight,
    customerCountry: shippingAddress?.country,
    customerState: shippingAddress?.state,
    customerCity: shippingAddress?.city,
    customerPostalCode: shippingAddress?.postalCode,
    customerGroup: customer?.groupId ? String(customer.groupId) : undefined,
    customerRegistrationDate: customer?.createdAt,
  };

  const validation = await couponValidationService.validateCoupon(couponCode, context);

  if (!validation.valid) {
    return {
      coupon: null,
      discount: 0,
      freeShipping: false,
      errors: [
        {
          code: validation.code,
          field: "couponCode",
          message: validation.message,
        },
      ],
    };
  }

  const calculation = await couponCalculationService.calculateDiscount(
    validation.coupon,
    context.cartItems,
    context.cartSubtotal
  );

  return {
    coupon: validation.coupon,
    discount: calculation.discount,
    // calculateDiscount returns null for "waive the shipping fee, the caller
    // knows the amount".
    freeShipping:
      calculation.shippingDiscount === null ||
      !!validation.coupon.allowFreeShipping ||
      !!validation.coupon.freeShipping,
    errors: [],
  };
};

/**
 * Recomputes the whole checkout from the database: prices, stock, shipping,
 * coupon, VAT and total. Everything the client sent is treated as a *request*,
 * never as a fact.
 *
 * @returns {Promise<{errors: Array, summary: object, context: object}>}
 */
const buildCheckout = async (payload = {}, { customer, storeId } = {}) => {
  const errors = [];

  const { generalSettings, enabledMethods } = await loadStoreConfig(storeId);

  // --- Customer / guest ---------------------------------------------------
  const guestCheckoutEnabled = generalSettings?.allowGuestCheckout !== false;
  if (!customer && !guestCheckoutEnabled) {
    errors.push({
      code: "LOGIN_REQUIRED",
      field: "customer",
      message: "Vous devez être connecté pour finaliser votre commande.",
    });
  }

  // --- Cart ---------------------------------------------------------------
  const cart = await checkoutCartService.buildCartLines(payload.items);
  errors.push(...cart.errors);

  // --- Addresses ----------------------------------------------------------
  const shippingAddress = await resolveAddress(payload.shippingAddress, {
    customer,
    type: "shipping",
  });

  if (payload.shippingAddress?.addressId && !shippingAddress) {
    errors.push({
      code: "ADDRESS_NOT_FOUND",
      field: "shippingAddress",
      message: "L'adresse de livraison sélectionné est introuvable.",
    });
  }

  const billingSameAsShipping = payload.billingSameAsShipping !== false;
  const billingAddress = billingSameAsShipping
    ? shippingAddress
    : await resolveAddress(payload.billingAddress, { customer, type: "billing" });

  if (!billingSameAsShipping && payload.billingAddress?.addressId && !billingAddress) {
    errors.push({
      code: "ADDRESS_NOT_FOUND",
      field: "billingAddress",
      message: "L'adresse de facturation sélectionné est introuvable.",
    });
  }

  // A guest has no account e-mail, so the shipping address has to carry one:
  // it is the only way to send the confirmation.
  errors.push(
    ...validateAddress(shippingAddress, {
      label: "L'adresse de livraison",
      field: "shippingAddress",
      requireEmail: !customer,
    })
  );

  if (!billingSameAsShipping) {
    errors.push(
      ...validateAddress(billingAddress, {
        label: "L'adresse de facturation",
        field: "billingAddress",
      })
    );
  }

  if (shippingAddress?.country && !shipsToCountry(generalSettings, shippingAddress.country)) {
    errors.push({
      code: "COUNTRY_NOT_SHIPPED",
      field: "shippingAddress.country",
      message: `La boutique ne livre pas en ${shippingAddress.country}.`,
    });
  }

  // --- Coupon -------------------------------------------------------------
  const couponsEnabled = generalSettings?.enableCoupons !== false;
  const couponCode = couponsEnabled ? payload.couponCode : null;

  if (payload.couponCode && !couponsEnabled) {
    errors.push({
      code: "COUPONS_DISABLED",
      field: "couponCode",
      message: "Les codes promo ne sont pas activés sur cette boutique.",
    });
  }

  const couponResult = await applyCoupon(couponCode, {
    storeId,
    customer,
    cart,
    shippingAddress,
  });
  errors.push(...couponResult.errors);

  const discount = round2(Math.min(couponResult.discount, cart.subtotal));

  // --- Shipping -----------------------------------------------------------
  const shippingContext = {
    country: shippingAddress?.country,
    postalCode: shippingAddress?.postalCode,
    subtotal: round2(cart.subtotal - discount),
    subtotalBeforeDiscount: cart.subtotal,
    hasFreeShippingCoupon: couponResult.freeShipping,
  };

  const { options: shippingOptions, pickupLocations, zone } =
    await shippingRateService.getShippingOptions(storeId, shippingContext);

  const selectedShipping =
    shippingOptions.find((option) => option.id === payload.shippingMethodId) || null;

  if (payload.shippingMethodId && !selectedShipping) {
    errors.push({
      code: "SHIPPING_METHOD_UNAVAILABLE",
      field: "shippingMethodId",
      message:
        "Le mode de livraison sélectionné n'est plus disponible pour cette adresse.",
    });
  } else if (!payload.shippingMethodId) {
    errors.push({
      code: "SHIPPING_METHOD_REQUIRED",
      field: "shippingMethodId",
      message: "Veuillez choisir un mode de livraison.",
    });
  }

  if (shippingOptions.length === 0) {
    errors.push({
      code: "NO_SHIPPING_AVAILABLE",
      field: "shippingMethodId",
      message: "Aucun mode de livraison n'est disponible pour cette destination.",
    });
  }

  let pickupLocation = null;
  if (selectedShipping?.requiresPickupLocation) {
    pickupLocation =
      pickupLocations.find(
        (location) => String(location._id) === String(payload.pickupLocationId)
      ) || null;

    if (!pickupLocation) {
      errors.push({
        code: "PICKUP_LOCATION_REQUIRED",
        field: "pickupLocationId",
        message: "Veuillez choisir un point de retrait.",
      });
    }
  }

  // A coupon granting free shipping waives the fee whichever method was picked.
  const shippingCost = couponResult.freeShipping ? 0 : selectedShipping?.cost || 0;

  // --- Payment ------------------------------------------------------------
  const paymentMethod =
    enabledMethods.find((method) => method.key === payload.paymentMethod) || null;

  if (!payload.paymentMethod) {
    errors.push({
      code: "PAYMENT_METHOD_REQUIRED",
      field: "paymentMethod",
      message: "Veuillez choisir un moyen de paiement.",
    });
  } else if (!paymentMethod) {
    errors.push({
      code: "PAYMENT_METHOD_UNAVAILABLE",
      field: "paymentMethod",
      message: "Ce moyen de paiement n'est pas proposé par la boutique.",
    });
  }

  // --- Taxes --------------------------------------------------------------
  const tax = checkoutTaxService.calculateTax({
    lines: cart.lines,
    shippingCost,
    shippingTaxable: selectedShipping ? selectedShipping.taxable : true,
    discount,
    settings: generalSettings,
  });

  // With tax-inclusive prices the VAT is already part of the subtotal, so it
  // must not be added a second time.
  const total = round2(
    cart.subtotal - discount + shippingCost + (tax.pricesIncludeTax ? 0 : tax.amount)
  );

  const summary = {
    items: cart.lines.map((line) => ({
      productId: line.productId,
      variationId: line.variationId,
      name: line.name,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    totalQuantity: cart.totalQuantity,
    subtotal: cart.subtotal,
    discount,
    coupon: couponResult.coupon
      ? {
          code: couponResult.coupon.code,
          discountType: couponResult.coupon.discountType,
          amount: couponResult.coupon.amount,
          freeShipping: couponResult.freeShipping,
        }
      : null,
    shipping: selectedShipping
      ? {
          id: selectedShipping.id,
          carrier: selectedShipping.carrier,
          title: selectedShipping.title,
          type: selectedShipping.type,
          cost: shippingCost,
          estimatedDelivery: selectedShipping.estimatedDelivery,
          pickupLocation: pickupLocation
            ? { id: String(pickupLocation._id), name: pickupLocation.name }
            : null,
        }
      : null,
    tax: {
      enabled: tax.enabled,
      rate: tax.rate,
      amount: tax.amount,
      includedInPrices: tax.pricesIncludeTax,
    },
    total,
    currency: generalSettings?.currencyId?.symbol || "$",
  };

  return {
    errors,
    summary,
    context: {
      storeId,
      cart,
      shippingAddress,
      billingAddress,
      billingSameAsShipping,
      selectedShipping,
      pickupLocation,
      shippingOptions,
      pickupLocations,
      zone,
      paymentMethod,
      coupon: couponResult.coupon,
      discount,
      shippingCost,
      tax,
      total,
      // Snapshotted on the order: the store can switch currency later, the
      // amounts already charged stay expressed in the one they were computed in.
      currency:
        generalSettings?.currencyId?.name || generalSettings?.currencyId?.symbol || "",
      notes: String(payload.notes || "").trim().slice(0, 1000),
      generalSettings,
      enabledMethods,
      guestCheckoutEnabled,
    },
  };
};

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Everything the checkout page needs to render: who the customer is, the
 * addresses they can reuse, the delivery options for a destination and the
 * payment methods the store actually enabled.
 */
const getCheckoutContext = async ({ customer, query = {}, storeId } = {}) => {
  const { generalSettings, enabledMethods } = await loadStoreConfig(storeId);

  const addresses = customer
    ? await CustomerAddress.find({ customerId: customer._id }).sort({
        isDefault: -1,
        _id: -1,
      })
    : [];

  const subtotal = Number(query.subtotal) || 0;
  const [shipping, shippingCountries] = await Promise.all([
    shippingRateService.getShippingOptions(storeId, {
      country: query.country,
      postalCode: query.postalCode,
      subtotal,
      subtotalBeforeDiscount: subtotal,
    }),
    shippingCountriesFor(generalSettings),
  ]);

  return {
    customer: customer
      ? {
          id: String(customer._id),
          firstName: customer.firstName,
          lastName: customer.lastName,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        }
      : null,
    isGuest: !customer,
    guestCheckoutEnabled: generalSettings?.allowGuestCheckout !== false,
    addresses: {
      shipping: addresses.filter((address) => address.type === "shipping"),
      billing: addresses.filter((address) => address.type === "billing"),
      other: addresses.filter((address) => address.type === "other"),
    },
    shipping: {
      zone: shipping.zone,
      options: shipping.options,
      pickupLocations: shipping.pickupLocations,
      hideCostsUntilAddress: shipping.hideCostsUntilAddress,
      destination: shipping.shippingDestination,
      countries: shippingCountries,
    },
    paymentMethods: enabledMethods.map((method) => ({
      key: method.key,
      title: method.title,
      description: method.description,
      isOffline: method.isOffline,
      config: method.config,
    })),
    settings: {
      currency: generalSettings?.currencyId?.symbol || "$",
      currencyName: generalSettings?.currencyId?.name || "",
      taxesEnabled: !!generalSettings?.enableTaxes,
      taxRate: Number(generalSettings?.taxRate) || 0,
      pricesIncludeTax: !!generalSettings?.pricesIncludeTax,
      couponsEnabled: generalSettings?.enableCoupons !== false,
      weightUnit: generalSettings?.weightUnit || "kg",
      storeName: generalSettings?.storeName || "",
    },
  };
};

/**
 * Dry run of the whole checkout: same computation as place-order, without
 * touching stock or creating anything.
 */
const validateCheckout = async (payload, { customer, storeId } = {}) => {
  const { errors, summary } = await buildCheckout(payload, { customer, storeId });

  return { valid: errors.length === 0, errors, summary };
};

// Saves the addresses the customer asked to keep, and returns the ids of the
// ones actually created, keyed by type, so the order can point at them.
const persistNewAddresses = async (customer, addresses) => {
  const created = {};
  if (!customer) return created;

  for (const address of addresses) {
    if (!address?.saveAddress || address.addressId) continue;

    try {
      const existing = await CustomerAddress.countDocuments({
        customerId: customer._id,
        type: address.type,
      });

      const saved = await CustomerAddress.create({
        storeId: customer.storeId,
        customerId: customer._id,
        type: address.type,
        firstName: address.firstName,
        lastName: address.lastName || "",
        company: address.company,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        phone: address.phone,
        isDefault: existing === 0,
      });

      created[address.type] = saved._id;
    } catch (err) {
      // Saving the address is a convenience, never a reason to fail an order.
      logger.error("Failed to save checkout address", err.message);
    }
  }

  return created;
};

const sendConfirmationEmail = async (order, { context, payment }) => {
  const to = order.user_info?.email;
  if (!to) return;

  try {
    // The order exists but nothing is settled yet  "order on-hold" is the
    // store-configurable notification that matches this moment ("Your order
    // has been received!").
    const { enabled, notification } = await emailSettingsService.getNotificationForActiveStore(
      "order_on_hold"
    );
    if (!enabled) return;

    const storeName = context.generalSettings?.storeName || "";
    const vars = { store_name: storeName, order_number: order.orderNumber };

    const estimated = context.selectedShipping?.estimatedDelivery;

    const html = orderConfirmationEmailBody({
      heading: renderEmailPlaceholders(
        notification?.heading || "Merci pour votre commande !",
        vars
      ),
      orderNumber: order.orderNumber,
      date: new Date(order.createdAt).toLocaleDateString("fr-FR"),
      currency: context.generalSettings?.currencyId || "",
      paymentMethod: context.paymentMethod?.title || order.paymentMethod,
      shippingMethod: context.selectedShipping
        ? `${context.selectedShipping.carrier}${
            context.pickupLocation ? `  ${context.pickupLocation.name}` : ""
          }`
        : "",
      estimatedDelivery: estimated
        ? `${new Date(estimated.minDate).toLocaleDateString("fr-FR")}  ${new Date(
            estimated.maxDate
          ).toLocaleDateString("fr-FR")}`
        : "",
      items: context.cart.lines,
      subTotal: order.subTotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      couponCode: order.couponCode,
      tax: order.tax,
      taxRate: order.taxRate,
      total: order.total,
      shippingAddress: order.user_info,
      billingAddress: order.billing_info,
      instructions: payment?.instructions,
      company_name: storeName,
      company_email: process.env.EMAIL_USER,
    });

    // Queued (MAIL-04), not sent synchronously: an SMTP hiccup on this send
    // must never roll back  or even slow down  an order that already
    // exists. relatedEntity gives the queue its idempotency key
    // (store.order.created:<orderId>) so a retried checkout call, or the
    // worker itself re-picking up a job, can never double-send this order's
    // confirmation email.
    await EmailService.enqueue({
      to,
      storeId: order.storeId,
      channel: "store",
      type: "store.order.created",
      relatedEntity: String(order._id),
      subject: renderEmailPlaceholders(
        notification?.subject || "Votre commande {order_number}",
        vars
      ),
      html,
    });
  } catch (err) {
    // A mail server hiccup must never lose a placed order.
    logger.error("Failed to send order confirmation email", err.message);
  }
};

/**
 * Validates one last time, then creates the order, takes the stock out and
 * starts the payment. Stock is only reserved once every check passed, and it
 * is put back if the order itself cannot be saved.
 */
const placeOrder = async (payload, { customer, storeId } = {}) => {
  const { errors, summary, context } = await buildCheckout(payload, { customer, storeId });

  if (errors.length > 0) {
    const error = new Error("La commande n'a pas pu être validé.");
    error.statusCode = 422;
    error.code = "CHECKOUT_INVALID";
    error.errors = errors;
    error.summary = summary;
    throw error;
  }

  if (context.storeId) {
    // SO-06: reject before reserving stock so a blocked store doesn't tie up
    // inventory for an order it can't actually place.
    const quotaCheck = await SoftLimitService.checkQuotaAvailable(context.storeId, "orders", 1);
    if (!quotaCheck.allowed) {
      const error = new Error("Cette boutique a atteint son quota de commandes.");
      error.statusCode = 409;
      error.code = "QUOTA_EXCEEDED";
      throw error;
    }
  }

  const reservation = await stockReservationService.reserveStock(context.cart.lines, {
    note: "Checkout",
  });

  if (!reservation.ok) {
    const error = new Error(
      ` ${reservation.failedLine.name} à vient d'être épuis, votre commande n'a pas t validé.`
    );
    error.statusCode = 409;
    error.code = "STOCK_UNAVAILABLE";
    error.errors = [
      {
        code: "OUT_OF_STOCK",
        field: "items",
        productId: reservation.failedLine.productId,
        message: ` ${reservation.failedLine.name}  n'est plus disponible en quantité suffisante.`,
      },
    ];
    throw error;
  }

  let order;
  try {
    order = await new Order({
      storeId: context.storeId,
      user: customer?._id || null,
      isGuest: !customer,
      // The invoice/PDF templates read `cart`, so the lines are stored in the
      // shape they expect (title/price/quantity) alongside the ids.
      cart: context.cart.lines.map((line) => ({
        id: line.productId,
        productId: line.productId,
        variationId: line.variationId,
        title: line.name,
        sku: line.sku,
        price: line.unitPrice,
        quantity: line.quantity,
        itemTotal: line.lineTotal,
      })),
      user_info: toOrderInfo(context.shippingAddress),
      billing_info: context.billingSameAsShipping
        ? undefined
        : toOrderInfo(context.billingAddress),
      billingSameAsShipping: context.billingSameAsShipping,
      // Only set when the customer picked an address they had already saved.
      // A brand new one only gets an id once it is persisted, further down.
      shippingAddressId: context.shippingAddress?.addressId || null,
      billingAddressId: context.billingSameAsShipping
        ? context.shippingAddress?.addressId || null
        : context.billingAddress?.addressId || null,
      subTotal: context.cart.subtotal,
      shippingCost: context.shippingCost,
      discount: context.discount,
      discountAmount: context.discount,
      couponId: context.coupon?._id,
      couponCode: context.coupon?.code,
      tax: context.tax.amount,
      taxRate: context.tax.rate,
      total: context.total,
      shippingOption: context.selectedShipping?.title,
      shippingMethod: context.selectedShipping
        ? {
            zoneId: context.selectedShipping.zoneId,
            methodId: context.selectedShipping.methodId,
            type: context.selectedShipping.type,
            carrier: context.selectedShipping.carrier,
            title: context.selectedShipping.title,
            cost: context.shippingCost,
            pickupLocationId: context.pickupLocation?._id,
            estimatedDeliveryMinDate: context.selectedShipping.estimatedDelivery?.minDate,
            estimatedDeliveryMaxDate: context.selectedShipping.estimatedDelivery?.maxDate,
          }
        : undefined,
      currency: context.currency,
      notes: context.notes,
      paymentMethod: context.paymentMethod.key,
      paymentStatus: "pending",
      status: "Pending",
    }).save();

    // The relational copy of the lines. Written before the payment starts, so
    // a failure here only costs a checkout the customer can retry  never a
    // paid order whose lines are missing.
    await orderItemService.createForOrder(order, context);

    // What the order now holds out of the catalogue. The units were taken by
    // reserveStock above; this is what says which order is holding them.
    await stockReservationService.recordForOrder(order._id, context.cart.lines);

    // First entry of the timeline: the order exists and waits for its payment.
    await orderStatusHistoryService.record(order._id, "Pending", {
      comment: "Commande passé au checkout.",
    });

    if (context.storeId) {
      // Non-fatal: usage tracking must never roll back a successful order.
      // Counted here (order row exists) rather than after payment settles,
      // since a failed-payment order still persists as a real document.
      StoreUsageService.incrementUsage(context.storeId, "orders", 1).catch(() => {});
    }
  } catch (err) {
    // The order exists but not everything that goes with it: undo the whole
    // creation rather than leave a half-written order behind. The units are
    // credited back from the cart lines, so the reservation rows are dropped
    // without releasing them a second time.
    if (order?._id) {
      await Promise.all([
        Order.deleteOne({ _id: order._id }).catch(() => {}),
        orderItemService.deleteForOrder(order._id).catch(() => {}),
        stockReservationService.deleteForOrder(order._id).catch(() => {}),
      ]);
    }
    await stockReservationService.releaseStock(context.cart.lines);
    throw err;
  }

  // --- Payment ------------------------------------------------------------
  let payment;
  try {
    const paymentMethodWithCredentials = await enrichMethodWithCredentials(
      context.storeId,
      context.paymentMethod
    );
    payment = await paymentGatewayService.initiatePayment(order, paymentMethodWithCredentials);

    // The accounting record of the attempt. An offline method has no
    // transaction anywhere, so it starts as a pending row the back-office
    // settles by hand once the cash or the transfer arrives.
    const paymentRecord = await paymentService.create({
      orderId: order._id,
      method: context.paymentMethod.key,
      transactionId: payment.reference,
      amount: context.total,
      status: payment.paymentStatus,
    });

    order.paymentStatus = payment.paymentStatus;
    order.paymentId = paymentRecord._id;
    order.paymentDetails = {
      provider: payment.provider,
      reference: payment.reference,
      ...payment.details,
    };
    await order.save();
  } catch (err) {
    // The gateway refused to start: nothing was charged, so the order is
    // marked failed and the stock goes back to the catalogue. The failed
    // attempt is still recorded  that is half of what a payment log is for.
    const failedPayment = await paymentService
      .create({
        orderId: order._id,
        method: context.paymentMethod.key,
        amount: context.total,
        status: "failed",
      })
      .catch(() => null);

    order.paymentStatus = "failed";
    order.paymentId = failedPayment?._id || null;
    order.status = "Cancel";
    order.paymentDetails = { error: err.message };
    await order.save().catch(() => {});
    await orderStatusHistoryService.record(order._id, "Cancel", {
      comment: `Paiement refusé : ${err.message}`,
    });
    // Through the reservation rows rather than the cart lines: each hold is
    // claimed before being credited, so a release racing with an admin one
    // can't put the same units back twice.
    await stockReservationService.releaseForOrder(order._id);

    err.statusCode = err.statusCode || 502;
    err.orderId = String(order._id);
    throw err;
  }

  // --- Side effects (never block the order) -------------------------------
  if (context.coupon && customer) {
    // CouponUsage requires a customer, so guest usages simply aren't tracked.
    await couponUsageService
      .recordUsage(context.storeId, context.coupon._id, customer._id, order._id, context.discount)
      .catch((err) => logger.error("Failed to record coupon usage", err.message));
  }

  const savedAddresses = await persistNewAddresses(customer, [
    context.shippingAddress,
    context.billingSameAsShipping ? null : context.billingAddress,
  ]).catch(() => ({}));

  // An address typed at checkout only exists once it has been saved, so the
  // order can only point at it now.
  if (!order.shippingAddressId && savedAddresses.shipping) {
    order.shippingAddressId = savedAddresses.shipping;
    if (context.billingSameAsShipping) {
      order.billingAddressId = savedAddresses.shipping;
    }
  }
  if (!order.billingAddressId && savedAddresses.billing) {
    order.billingAddressId = savedAddresses.billing;
  }
  if (order.isModified()) {
    await order
      .save()
      .catch((err) => logger.error("Failed to link order addresses", err.message));
  }

  await Notification.create({
    orderId: order._id,
    customerId: order.customerId,
    message: `${order.user_info?.name || "Un client"} a passé une commande de ${formatMoney(
      Number(order.total),
      context.generalSettings?.currencyId
    )} (${order.orderNumber}).`,
  }).catch((err) => logger.error("Failed to create order notification", err.message));

  emitEvent("order.created", {
    storeId: order.storeId,
    entityId: order._id,
    metadata: {
      orderNumber: order.orderNumber,
      customerName: order.user_info?.name || "Client",
      total: formatMoney(Number(order.total), context.generalSettings?.currencyId),
    },
    actionUrl: `/dashboard/orders/${order._id}`,
  });

  if (customer?._id) {
    notificationService
      .notify({
        event: "customer.order_confirmed",
        storeId: order.storeId,
        entityId: order._id,
        recipients: [customer._id],
        recipientModel: "Customer",
        category: "orders",
        metadata: {
          orderNumber: order.orderNumber,
          total: formatMoney(Number(order.total), context.generalSettings?.currencyId),
        },
        actionUrl: `/order/${order._id}`,
      })
      .catch((err) => logger.error("Failed to notify customer of order confirmation", err.message));
  }

  await sendConfirmationEmail(order, { context, payment });

  return { order, payment, summary };
};

/**
 * Reads back an order for the confirmation page. A logged-in customer can only
 * see their own; a guest has to prove they know the e-mail the order was
 * placed with, so an order id on its own never discloses anything.
 */
const getOrderForConfirmation = async (orderId, { customer, email } = {}) => {
  const order = await Order.findById(orderId).catch(() => null);
  if (!order) return null;

  if (customer && order.user && String(order.user) === String(customer._id)) {
    return order;
  }

  const orderEmail = String(order.user_info?.email || "").toLowerCase();
  const claimedEmail = String(email || "").trim().toLowerCase();

  if (order.isGuest && orderEmail && orderEmail === claimedEmail) {
    return order;
  }

  return null;
};

module.exports = {
  getCheckoutContext,
  validateCheckout,
  placeOrder,
  getOrderForConfirmation,
  // exported for tests
  buildCheckout,
  resolveAddress,
  validateAddress,
  toOrderInfo,
};
