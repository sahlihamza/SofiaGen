const { getActiveSubscriptionStatuses, getSubscriptionStatusForAssignment } = require('./subscriptionRules');

describe('subscriptionRules', () => {
  it('treats active, trial, and past_due as the active subscription states', () => {
    expect(getActiveSubscriptionStatuses()).toEqual(['active', 'trial', 'past_due']);
  });

  it('uses trial status when a trial period is requested', () => {
    expect(getSubscriptionStatusForAssignment({ trialDays: 14 })).toBe('trial');
  });

  it('uses active status when no trial is requested', () => {
    expect(getSubscriptionStatusForAssignment({ trialDays: 0 })).toBe('active');
  });
});
