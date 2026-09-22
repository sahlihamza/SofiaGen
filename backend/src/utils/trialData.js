const trialData = [
  {
    storeName: "Store A",
    planName: "Basic Plan",
    trialDays: 7,
    trialStartDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "trial",
    notifications: ["j7", "j3", "j1"],
  },
  {
    storeName: "Store B",
    planName: "Pro Plan",
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    status: "trial",
    notifications: ["j7", "j3"],
  },
  {
    storeName: "Store C",
    planName: "Enterprise Plan",
    trialDays: 30,
    trialStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    status: "trial",
    notifications: ["j7"],
  },
  {
    storeName: "Store D",
    planName: "Basic Plan",
    trialDays: 7,
    trialStartDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "expired",
    notifications: [],
  },
  {
    storeName: "Store E",
    planName: "Pro Plan",
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    notifications: ["j7", "j3", "j1"],
  },
];

module.exports = trialData;