import { QueryClient, DefaultOptions } from "@tanstack/react-query";

/**
 * Global query client configuration.
 * Individual query cache settings should use cacheConfig from query-keys.ts
 */

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes default
    gcTime: 10 * 60 * 1000, // 10 minutes default
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
    placeholderData: (previousData) => previousData,
  },
  mutations: {
    retry: 1,
  },
};

const createQueryClient = () => new QueryClient({ defaultOptions });

// Singleton pattern for query client
const globalForQueryClient = globalThis as typeof globalThis & {
  __TL_QUERY_CLIENT__?: QueryClient;
};

export const queryClient =
  globalForQueryClient.__TL_QUERY_CLIENT__ ?? createQueryClient();

globalForQueryClient.__TL_QUERY_CLIENT__ = queryClient;
