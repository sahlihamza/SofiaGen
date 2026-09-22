const mongoose = require('mongoose');
const ShippingZone = require('../models/ShippingZone');
const ShippingZoneService = require('../service/ShippingZoneService');
const shippingRateService = require('../service/shippingRateService');
const StoreCarrierProvider = require('../models/shipping/StoreCarrierProvider');
const CarrierProvider = require('../models/shipping/CarrierProvider');
const Store = require('../models/Store');

describe('Phase 4: Shipping Zone Live Mode with Fallback', () => {
  let storeId, carrierId, storeCarrierId, manualZoneId, liveZoneId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/sofiagen-test');
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await ShippingZone.deleteMany({});
    await Store.deleteMany({});
    await CarrierProvider.deleteMany({});
    await StoreCarrierProvider.deleteMany({});

    const store = await Store.create({ name: 'Test Store' });
    storeId = store._id;

    const carrier = await CarrierProvider.create({
      name: 'Test Carrier',
      adapterKey: 'test-adapter',
      isInternalFleet: false,
    });
    carrierId = carrier._id;

    const storeCarrier = await StoreCarrierProvider.create({
      storeId,
      carrierProviderId: carrierId,
      credentials: { apiKey: 'test-key', secretKey: 'test-secret' },
      isActive: true,
    });
    storeCarrierId = storeCarrier._id;
  });

  describe('Backward Compatibility: Manual Mode', () => {
    test('existing zones remain in manual mode with default value', async () => {
      const zone = await ShippingZoneService.createShippingZone(storeId, {
        name: 'Default Zone',
        countries: ['US'],
        zipCodes: [],
      });
      expect(zone.mode).toBe('manual');
      expect(zone.carrierProviderId).toBeUndefined();
    });

    test('manual zone without carrierProviderId is valid', async () => {
      const zone = await ShippingZone.create({
        storeId,
        name: 'Manual Zone',
        mode: 'manual',
      });
      await zone.validate(); // Should not throw
      expect(zone.mode).toBe('manual');
    });

    test('manual zone with method calculates correctly', async () => {
      const zone = await ShippingZoneService.createShippingZone(storeId, {
        name: 'Manual Zone',
        countries: ['US'],
      });
      manualZoneId = zone._id;

      await ShippingZoneService.addShippingMethod(zone._id, storeId, {
        type: 'flat_rate',
        title: 'Standard Shipping',
        cost: 10,
      });

      const updated = await ShippingZone.findById(zone._id);
      expect(updated.methods).toHaveLength(1);
      expect(updated.methods[0].cost).toBe(10);
    });
  });

  describe('Live Mode Configuration', () => {
    test('live mode requires carrierProviderId', async () => {
      const zone = new ShippingZone({
        storeId,
        name: 'Live Zone',
        mode: 'live',
      });

      await expect(zone.validate()).rejects.toThrow();
    });

    test('live mode with valid carrierProviderId is valid', async () => {
      const zone = new ShippingZone({
        storeId,
        name: 'Live Zone',
        mode: 'live',
        carrierProviderId: storeCarrierId,
      });

      await zone.validate(); // Should not throw
    });

    test('cannot set zone to live mode if carrier not connected', async () => {
      const zone = await ShippingZoneService.createShippingZone(storeId, {
        name: 'Test Zone',
        countries: ['US'],
      });

      const fakeCarrierId = new mongoose.Types.ObjectId();

      await expect(
        ShippingZoneService.updateShippingZone(zone._id, storeId, {
          name: zone.name,
          mode: 'live',
          carrierProviderId: fakeCarrierId,
        })
      ).rejects.toThrow(/Carrier provider not found or not active/);
    });

    test('can set zone to live mode with connected carrier', async () => {
      const zone = await ShippingZoneService.createShippingZone(storeId, {
        name: 'Test Zone',
        countries: ['US'],
      });

      const updated = await ShippingZoneService.updateShippingZone(
        zone._id,
        storeId,
        {
          name: zone.name,
          mode: 'live',
          carrierProviderId: storeCarrierId,
        }
      );

      expect(updated.mode).toBe('live');
      expect(String(updated.carrierProviderId)).toBe(String(storeCarrierId));
    });

    test('switching back to manual clears carrierProviderId', async () => {
      const zone = await ShippingZone.create({
        storeId,
        name: 'Live Zone',
        mode: 'live',
        carrierProviderId: storeCarrierId,
      });

      const updated = await ShippingZoneService.updateShippingZone(
        zone._id,
        storeId,
        {
          name: zone.name,
          mode: 'manual',
        }
      );

      expect(updated.mode).toBe('manual');
      expect(updated.carrierProviderId).toBeUndefined();
    });
  });

  describe('Rate Resolution', () => {
    test('manual zone returns no cost', async () => {
      const zone = await ShippingZone.create({
        storeId,
        name: 'Manual Zone',
        mode: 'manual',
        methods: [
          {
            type: 'flat_rate',
            title: 'Standard',
            cost: 15,
            enabled: true,
          },
        ],
      });

      const rate = await shippingRateService.resolveShippingRate(
        zone,
        storeId,
        { items: [] },
        { country: 'US' }
      );

      expect(rate.mode).toBe('manual');
      expect(rate.isLive).toBe(false);
    });

    test('live zone calculates rate with stub', async () => {
      const zone = await ShippingZone.create({
        storeId,
        name: 'Live Zone',
        mode: 'live',
        carrierProviderId: storeCarrierId,
        methods: [
          {
            type: 'flat_rate',
            title: 'Fallback',
            cost: 20,
            enabled: true,
          },
        ],
      });

      const rate = await shippingRateService.resolveShippingRate(
        zone,
        storeId,
        { items: [] },
        { country: 'US' }
      );

      expect(rate.mode).toBe('live');
      expect(rate.isLive).toBe(true);
      expect(typeof rate.cost).toBe('number');
      expect(rate.cost).toBeGreaterThan(0);
    });

    test('live mode falls back to manual if stub fails', async () => {
      const zone = await ShippingZone.create({
        storeId,
        name: 'Live Zone',
        mode: 'live',
        carrierProviderId: new mongoose.Types.ObjectId(),
        methods: [
          {
            type: 'flat_rate',
            title: 'Emergency Fallback',
            cost: 25,
            enabled: true,
          },
        ],
      });

      const rate = await shippingRateService.resolveShippingRate(
        zone,
        storeId,
        { items: [] },
        { country: 'US' }
      );

      expect(rate.fallbackUsed).toBe(true);
      expect(rate.cost).toBe(25);
      expect(rate.warning).toContain('fallback');
    });

    test('live mode throws if no fallback available', async () => {
      const zone = await ShippingZone.create({
        storeId,
        name: 'Live Zone',
        mode: 'live',
        carrierProviderId: new mongoose.Types.ObjectId(),
        methods: [],
      });

      await expect(
        shippingRateService.resolveShippingRate(
          zone,
          storeId,
          { items: [] },
          { country: 'US' }
        )
      ).rejects.toThrow(/Live shipping rate unavailable/);
    });
  });

  describe('Validation Rules', () => {
    test('invalid mode rejected', async () => {
      const zone = await ShippingZoneService.createShippingZone(storeId, {
        name: 'Test Zone',
      });

      await expect(
        ShippingZoneService.updateShippingZone(zone._id, storeId, {
          name: zone.name,
          mode: 'invalid_mode',
        })
      ).rejects.toThrow(/Invalid mode/);
    });

    test('live mode without carrierProviderId rejected in update', async () => {
      const zone = await ShippingZoneService.createShippingZone(storeId, {
        name: 'Test Zone',
      });

      await expect(
        ShippingZoneService.updateShippingZone(zone._id, storeId, {
          name: zone.name,
          mode: 'live',
        })
      ).rejects.toThrow(/Carrier provider is required/);
    });

    test('inactive carrier cannot be assigned', async () => {
      const inactiveCarrier = await StoreCarrierProvider.create({
        storeId,
        carrierProviderId: carrierId,
        credentials: { apiKey: 'key2', secretKey: 'secret2' },
        isActive: false,
      });

      const zone = await ShippingZoneService.createShippingZone(storeId, {
        name: 'Test Zone',
      });

      await expect(
        ShippingZoneService.updateShippingZone(zone._id, storeId, {
          name: zone.name,
          mode: 'live',
          carrierProviderId: inactiveCarrier._id,
        })
      ).rejects.toThrow(/not found or not active/);
    });
  });
});
