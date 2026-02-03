/**
 * React Query Provider
 * Wraps the app with QueryClient for data fetching and caching
 */

'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cache time: how long unused data stays in cache
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests
      retry: 1,
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations
      retry: 0,
    },
  },
});

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Export queryClient for manual cache invalidation
export { queryClient };

