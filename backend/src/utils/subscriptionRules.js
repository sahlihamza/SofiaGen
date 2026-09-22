const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trial', 'past_due'];

const getActiveSubscriptionStatuses = () => ACTIVE_SUBSCRIPTION_STATUSES;

const getSubscriptionStatusForAssignment = ({ trialDays } = {}) => {
  if (Number(trialDays) > 0) {
    return 'trial';
  }

  return 'active';
};

module.exports = {
  ACTIVE_SUBSCRIPTION_STATUSES,
  getActiveSubscriptionStatuses,
  getSubscriptionStatusForAssignment,
};
