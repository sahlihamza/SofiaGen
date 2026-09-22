// Shared badge coloring for an order's delivery-tracking sub-status (distinct
// from the order's overall `status`, see Status.jsx). Used on both the
// admin-facing rider detail page and the rider's own driver dashboard.
export const getTrackingBadgeClasses = (trackingStatus) => {
  switch (trackingStatus) {
    case "Delivered":
      return "bg-emerald-50 text-emerald-600";
    case "On The Way":
      return "bg-blue-50 text-blue-600";
    case "Confirmed":
      return "bg-amber-50 text-amber-600";
    default:
      return "bg-gray-100 text-gray-500";
  }
};
