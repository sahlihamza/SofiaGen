const DEFAULT_SHIPPING_METHOD_TITLES = {
  flat_rate: "Flat rate",
  free_shipping: "Free shipping",
};

const LEGACY_SHIPPING_METHOD_TITLES = {
  flat_rate: "Frais fixes",
  free_shipping: "Livraison gratuite",
};

const isUntouchedDefault = (value, type) =>
  value === DEFAULT_SHIPPING_METHOD_TITLES[type] ||
  value === LEGACY_SHIPPING_METHOD_TITLES[type];

export const getShippingMethodDisplayTitle = (method, t) =>
  isUntouchedDefault(method.title, method.type)
    ? t(
        method.type === "free_shipping"
          ? "ShippingMethodTypeFreeShipping"
          : "ShippingMethodTypeFlatRate"
      )
    : method.title;
