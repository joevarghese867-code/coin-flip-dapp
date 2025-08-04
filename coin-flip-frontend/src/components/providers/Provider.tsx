'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { AppWalletProvider } from '@/components/wallet/WalletProvider'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside the client component
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider>
        <AppWalletProvider>
          {children}
          <Toaster />
        </AppWalletProvider>
      </ClusterProvider>
    </QueryClientProvider>
  )
}