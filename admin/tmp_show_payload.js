import { buildPlanPayload } from './src/utils/planPayload.js';

const plan = {
  name: 'Seed Growth',
  slug: 'seed-growth',
  description: 'Growth plan used for local subscription demos',
  badge: '',
  color: '#3B82F6',
  icon: '',
  pricing: { monthly: 29, yearly: 290, currency: 'USD', taxIncluded: false, trialDays: 7 },
  features: { multi_store: true, priority_support: true, custom_branding: true },
  limits: { products: 1000, storage_mb: 10240, team_members: 10 },
  status: 'active',
  notes: '',
  featureRefs: [],
  isDefault: false,
  displayOrder: 0,
  version: 1,
  _id: '6a6e383448ae96b1f416da85',
  createdAt: '2026-08-01T18:17:24.183Z',
  updatedAt: '2026-08-01T18:22:03.728Z',
  __v: 0,
  storesCount: 2,
  subscriptionsSummary: [
    { count: 1, status: 'active' },
    { count: 1, status: 'past_due' },
  ],
  strategy: 'new_subscribers_only',
};

const out = buildPlanPayload(plan, plan.strategy);
console.log(JSON.stringify(out, null, 2));
