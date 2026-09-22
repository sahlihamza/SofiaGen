import { useQuery } from "@tanstack/react-query";

//internal import
import OrderServices from "@/services/OrderServices";
import { ORDER_STATUSES } from "@/utils/orderStatus";

// The orders endpoint returns `totalDoc` for whatever query it was given, and
// nothing per status  so the tab counters ask for one row per status and read
// the count off the response. They intentionally ignore the active tab (a tab
// has to show its own size while another one is selected) but do follow the
// other filters, the way WooCommerce's own counters do.
const useOrderStatusCounts = ({
  time = "",
  method = "",
  startDate = "",
  endDate = "",
  searchText = "",
  version = 0,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: [
      "orderStatusCounts",
      time,
      method,
      startDate,
      endDate,
      searchText,
      version,
    ],
    queryFn: async () => {
      const responses = await Promise.all(
        ORDER_STATUSES.map((status) =>
          OrderServices.getAllOrders({
            page: 1,
            limit: 1,
            status,
            day: time || "",
            method: method || "",
            startDate: startDate || "",
            endDate: endDate || "",
            customerName: searchText || "",
          })
        )
      );

      return ORDER_STATUSES.reduce(
        (counts, status, i) => ({
          ...counts,
          [status]: responses[i]?.totalDoc || 0,
        }),
        {}
      );
    },
    staleTime: 30 * 1000,
  });

  if (!data) return { counts: {}, loading: isLoading };

  // "Tous" is the same query without a status, which the API answers as the
  // union of the four  so it can be summed instead of fetched again.
  const all = ORDER_STATUSES.reduce(
    (total, status) => total + (data[status] || 0),
    0
  );

  return { counts: { ...data, all }, loading: isLoading };
};

export default useOrderStatusCounts;
