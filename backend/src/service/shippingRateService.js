const ShippingZone = require("../models/ShippingZone");
const PickupLocation = require("../models/PickupLocation");
const Country = require("../models/Country");
const StoreCarrierProvider = require("../models/shipping/StoreCarrierProvider");
const CarrierProvider = require("../models/shipping/CarrierProvider");
const shippingSettingsService = require("./shippingSettingsService");
const logger = require("../config/logger");

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalize = (value) => String(value || "").trim().toUpperCase();

// Zones store ISO2 codes while addresses (storefront form, CustomerAddress)
// hold the country name. Resolve both so a zone configured on "TN" still
// matches an address saying "Tunisia".
const countryAliases = async (country) => {
  const raw = normalize(country);
  if (!raw) return [];

  const aliases = new Set([raw]);

  const match = await Country.findOne({
    $or: [
      { iso2: raw },
      { iso3: raw },
      { name: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    ],
  });

  if (match) {
    aliases.add(normalize(match.iso2));
    aliases.add(normalize(match.iso3));
    aliases.add(normalize(match.name));
  }

  return [...aliases];
};

// WooCommerce-style postcode matching: exact codes, `*` wildcards and
// `1000...2000` numeric ranges.
const matchesPostalCode = (patterns, postalCode) => {
  const code = normalize(postalCode);
  if (!patterns?.length) return true;
  if (!code) return false;

  return patterns.some((pattern) => {
    const raw = normalize(pattern);
    if (!raw) return false;

    if (raw.includes("...")) {
      const [from, to] = raw.split("...").map((bound) => Number(bound.trim()));
      const numeric = Number(code);
      return (
        Number.isFinite(from) &&
        Number.isFinite(to) &&
        Number.isFinite(numeric) &&
        numeric >= from &&
        numeric <= to
      );
    }

    if (raw.includes("*")) {
      const regex = new RegExp(
        `^${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*")}$`
      );
      return regex.test(code);
    }

    return raw === code;
  });
};

/**
 * The first zone whose region contains the destination wins; the store's
 * "Rest of the World" zone catches everything else.
 */
const findZoneForAddress = async (storeId, { country, postalCode } = {}) => {
  const zones = await ShippingZone.find({ storeId }).sort({
    isDefault: 1,
    order: 1,
    _id: -1,
  });

  const aliases = await countryAliases(country);

  const match = zones.find(
    (zone) =>
      !zone.isDefault &&
      zone.countries?.length > 0 &&
      zone.countries.some((zoneCountry) => aliases.includes(normalize(zoneCountry))) &&
      matchesPostalCode(zone.zipCodes, postalCode)
  );

  return match || zones.find((zone) => zone.isDefault) || null;
};

const addDays = (days) => {
  if (days === null || days === undefined) return null;
  const date = new Date();
  date.setDate(date.getDate() + Number(days));
  return date;
};

const estimatedDelivery = (method) => {
  const min = method.estimatedDeliveryMinDays;
  const max = method.estimatedDeliveryMaxDays;

  if (min === null && max === null) return null;

  return {
    minDays: min ?? max,
    maxDays: max ?? min,
    minDate: addDays(min ?? max),
    maxDate: addDays(max ?? min),
  };
};

// free_shipping methods only show up once their requirement is satisfied.
const freeShippingAvailable = (method, { subtotal, subtotalBeforeDiscount, hasFreeShippingCoupon }) => {
  const base = method.applyMinBeforeCouponDiscount ? subtotalBeforeDiscount : subtotal;
  const minReached =
    method.minOrderAmount === null || method.minOrderAmount === undefined
      ? true
      : base >= method.minOrderAmount;

  switch (method.freeShippingRequirement) {
    case "coupon":
      return !!hasFreeShippingCoupon;
    case "min_amount":
      return minReached;
    case "min_amount_or_coupon":
      return minReached || !!hasFreeShippingCoupon;
    case "min_amount_and_coupon":
      return minReached && !!hasFreeShippingCoupon;
    case "no_requirement":
    default:
      return true;
  }
};

/**
 * Every delivery choice the customer may pick for this destination and cart.
 *
 * @returns {Promise<{zone, options: Array, pickupLocations: Array, hideCostsUntilAddress: boolean}>}
 */
const getShippingOptions = async (
  storeId,
  {
    country,
    postalCode,
    subtotal = 0,
    subtotalBeforeDiscount = subtotal,
    hasFreeShippingCoupon = false,
  } = {}
) => {
  const [settings, zone] = await Promise.all([
    shippingSettingsService.getByStoreId(storeId),
    findZoneForAddress(storeId, { country, postalCode }),
  ]);

  const options = [];

  const zoneMethods = [...(zone?.methods || [])]
    .filter((method) => method.enabled)
    .sort((a, b) => a.order - b.order);

  for (const method of zoneMethods) {
    if (
      method.type === "free_shipping" &&
      !freeShippingAvailable(method, {
        subtotal,
        subtotalBeforeDiscount,
        hasFreeShippingCoupon,
      })
    ) {
      continue;
    }

    options.push({
      id: `${zone._id}:${method._id}`,
      zoneId: String(zone._id),
      methodId: String(method._id),
      // No carrier entity exists in this project yet: the zone method *is* the
      // carrier the customer picks ("Flat rate", "DHL Express", ...).
      carrier: method.title,
      title: method.title,
      type: method.type,
      cost: method.type === "free_shipping" ? 0 : round2(method.cost || 0),
      taxable: method.taxStatus !== "none",
      requiresPickupLocation: method.type === "local_pickup",
      estimatedDelivery: estimatedDelivery(method),
    });
  }

  // Store-wide local pickup, configured outside the zones (Point of sale).
  if (settings?.localPickupEnabled) {
    options.push({
      id: "local_pickup",
      zoneId: null,
      methodId: null,
      carrier: settings.localPickupTitle || "Pickup",
      title: settings.localPickupTitle || "Pickup",
      type: "local_pickup",
      cost: settings.localPickupHasPrice ? round2(settings.localPickupPrice || 0) : 0,
      taxable: true,
      requiresPickupLocation: true,
      estimatedDelivery: null,
    });
  }

  const hasFreeOption = options.some((option) => option.cost === 0);
  const visibleOptions =
    settings?.hideRatesWhenFreeShippingAvailable && hasFreeOption
      ? options.filter((option) => option.cost === 0)
      : options;

  const pickupLocations = visibleOptions.some((option) => option.requiresPickupLocation)
    ? await PickupLocation.find({ storeId, enabled: true }).sort({ name: 1 })
    : [];

  return {
    zone: zone ? { id: String(zone._id), name: zone.name, isDefault: zone.isDefault } : null,
    options: visibleOptions,
    pickupLocations,
    hideCostsUntilAddress: !!settings?.hideCostsUntilAddress,
    // "billing_force" always bills to the billing address, "shipping" prefers
    // the shipping one  the checkout uses this to pick the taxable address.
    shippingDestination: settings?.shippingDestination || "billing",
  };
};

/**
 * Re-resolves the option the customer selected. Never trusts the cost the
 * client sends: the amount always comes back from the zone configuration.
 */
const resolveSelectedOption = async (storeId, selectedId, context) => {
  const { options, pickupLocations } = await getShippingOptions(storeId, context);
  const option = options.find((candidate) => candidate.id === selectedId) || null;

  return { option, options, pickupLocations };
};

/**
 * Resolves the final shipping rate for a zone.
 * - If zone.mode === "manual": uses manual method from zone.methods
 * - If zone.mode === "live": calls carrier adapter stub (Phase 5 replaces with real adapter)
 * - On live failure: falls back to manual tarif or error message
 * - Rate is frozen on order at checkout time (never recalculated)
 *
 * @returns {Promise<{cost: number, carrierName: string, mode: string, isLive: boolean, fallbackUsed?: boolean}>}
 */
const resolveShippingRate = async (zone, storeId, cart, address) => {
  if (!zone) {
    throw new Error("Shipping zone not found");
  }

  if (zone.mode === "manual") {
    return {
      cost: 0,
      carrierName: "Manual",
      mode: "manual",
      isLive: false,
    };
  }

  if (zone.mode === "live") {
    if (!zone.carrierProviderId) {
      throw new Error("Carrier provider not configured for live mode");
    }

    try {
      const storeCarrier = await StoreCarrierProvider.findOne({
        _id: zone.carrierProviderId,
        storeId,
      });

      if (!storeCarrier) {
        throw new Error("Carrier provider connection not found for this store");
      }

      const carrierProvider = await CarrierProvider.findById(
        storeCarrier.carrierProviderId
      );

      if (!carrierProvider) {
        throw new Error("Carrier provider configuration not found");
      }

      const liveRate = await getLiveRate(storeCarrier, cart, address);

      return {
        cost: round2(liveRate.cost),
        carrierName: carrierProvider.name,
        mode: "live",
        isLive: true,
      };
    } catch (err) {
      logger.warn(`Live shipping rate failed for zone ${zone._id}: ${err.message}`);

      const fallbackMethod = zone.methods?.find((m) => m.enabled);
      if (fallbackMethod && fallbackMethod.type !== "free_shipping") {
        return {
          cost: round2(fallbackMethod.cost || 0),
          carrierName: fallbackMethod.title,
          mode: "live",
          isLive: false,
          fallbackUsed: true,
          warning: `Live rate unavailable: using fallback ${fallbackMethod.title}`,
        };
      }

      throw new Error(
        `Live shipping rate unavailable and no fallback configured. ${err.message}`
      );
    }
  }

  throw new Error(`Unknown shipping mode: ${zone.mode}`);
};

/**
 * Phase 5: Call real CarrierAdapter.getRates()
 * Replaces Phase 4 stub with actual provider rates
 */
const getLiveRate = async (storeCarrier, cart, address) => {
  const ShipmentService = require('./ShipmentService');

  // Get carrier provider config
  const carrierProvider = await CarrierProvider.findById(storeCarrier.carrierProviderId);
  if (!carrierProvider) {
    throw new Error('Carrier provider not found');
  }

  // Get adapter and call real getRates()
  const adapter = await ShipmentService.getAdapter(carrierProvider, storeCarrier);

  try {
    const rate = await adapter.getRates(cart, address);
    return {
      cost: rate.cost,
      estimatedDays: rate.estimatedDays || 3,
      provider: rate.provider,
    };
  } catch (err) {
    // Fallback if provider API fails - return high estimate to trigger fallback
    logger.warn(`getRates failed for ${carrierProvider.name}: ${err.message}`);
    throw new Error(`Live rate calculation failed: ${err.message}`);
  }
};

module.exports = {
  getShippingOptions,
  resolveSelectedOption,
  findZoneForAddress,
  matchesPostalCode,
  freeShippingAvailable,
  estimatedDelivery,
  resolveShippingRate,
};
