import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import storeOwnerDashboardAPI from "@/services/storeOwnerDashboardAPI";

// SO-15: fetches a single dashboard widget (via the existing, independently
// cached GET /widget/:widget endpoint) only once it actually scrolls into
// view, instead of the initial page load paying for every section whether
// or not the merchant ever scrolls down to it.
const LazyDashboardWidget = ({ widget, storeId, range, skeletonHeight = "h-40", children }) => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible || !containerRef.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setIsVisible(true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-widget", widget, storeId, range],
    queryFn: () => storeOwnerDashboardAPI.getWidget(widget, range ? { range } : {}),
    enabled: isVisible && !!storeId,
    staleTime: 30 * 1000,
  });

  if (!isVisible || isLoading) {
    return (
      <div ref={containerRef} className={`animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700 ${skeletonHeight}`} />
    );
  }

  return <div ref={containerRef}>{children(data?.data)}</div>;
};

export default LazyDashboardWidget;
