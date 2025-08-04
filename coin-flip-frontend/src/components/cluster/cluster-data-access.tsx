'use client'
import { createContext, ReactNode, useContext } from 'react'

const ClusterContext = createContext<{
  cluster: { network: string; endpoint: string }
}>({
  cluster: { network: 'devnet', endpoint: 'https://api.devnet.solana.com' }
})

export function ClusterProvider({ children }: { children: ReactNode }) {
  const cluster = { network: 'devnet', endpoint: 'https://api.devnet.solana.com' }

  return (
    <ClusterContext.Provider value={{ cluster }}>
      {children}
    </ClusterContext.Provider>
  )
}

export function useCluster() {
  return useContext(ClusterContext)
}
