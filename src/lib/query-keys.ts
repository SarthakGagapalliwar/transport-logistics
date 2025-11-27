/**
 * Centralized query key factory for TanStack Query.
 * Ensures consistent key structure and enables targeted invalidation.
 */
export const queryKeys = {
  // Analytics
  analytics: {
    all: ["analytics"] as const,
    dashboard: ["analytics", "dashboard"] as const,
  },

  // Materials
  materials: {
    all: ["materials"] as const,
  },

  // Packages - single source of truth (eliminates duplicate keys)
  packages: {
    all: ["packages"] as const,
  },

  // Routes
  routes: {
    all: ["routes"] as const,
  },

  // Shipments
  shipments: {
    all: ["shipments"] as const,
    list: (isAdmin: boolean, userPackages: string[]) =>
      ["shipments", { isAdmin, userPackages }] as const,
    reports: (userId: string | null, role: string | null) =>
      ["shipments", "reports", { userId, role }] as const,
  },

  // Transporters
  transporters: {
    all: ["transporters"] as const,
  },

  // Users
  users: {
    all: ["users"] as const,
    profile: (userId: string) => ["users", "profile", userId] as const,
  },

  // Vehicles
  vehicles: {
    all: ["vehicles"] as const,
  },
} as const;

/**
 * Shared cache configuration presets
 */
export const cacheConfig = {
  /** Standard cache: 5min stale, 10min gc */
  standard: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  },

  /** Session-level cache: 30min stale, 6hr gc (for data that rarely changes) */
  session: {
    staleTime: 30 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  },

  /** Short cache: 2min stale, 5min gc (for frequently changing data) */
  short: {
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  },
} as const;
