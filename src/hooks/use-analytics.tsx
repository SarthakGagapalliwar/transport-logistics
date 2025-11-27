import { useQuery } from "@tanstack/react-query";
import { fetchAnalyticsData } from "@/utils/analytics-utils";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import type {
  RevenueData,
  ShipmentStatusCount,
  WeeklyShipmentCount,
  DashboardStats,
} from "@/types/analytics";

export type {
  RevenueData,
  ShipmentStatusCount,
  WeeklyShipmentCount,
  DashboardStats,
};

// ============================================================================
// Query Hook
// ============================================================================

export const useAnalyticsQuery = () => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: fetchAnalyticsData,
    ...cacheConfig.short, // Analytics data updates frequently
  });
};

// ============================================================================
// Legacy Hook (backwards compatibility)
// ============================================================================

const defaultStats: DashboardStats = {
  activeShipments: 0,
  totalVehicles: 0,
  totalTransporters: 0,
  revenueThisMonth: 0,
  shipmentTrend: 0,
  revenueTrend: 0,
};

/** @deprecated Use useAnalyticsQuery instead */
export const useAnalytics = () => {
  const { data: analyticsData, isLoading, error } = useAnalyticsQuery();

  return {
    revenueData: analyticsData?.revenueData ?? [],
    shipmentStatusData: analyticsData?.shipmentStatusData ?? [],
    weeklyShipmentData: analyticsData?.weeklyShipmentData ?? [],
    dashboardStats: analyticsData?.dashboardStats ?? defaultStats,
    isLoading,
    error,
  };
};
