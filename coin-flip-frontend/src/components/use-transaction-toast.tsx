'use client'
import { toast } from 'sonner'

export function useTransactionToast() {
  return (signature: string) => {
    toast.success('Transaction sent!', {
      description: `Signature: ${signature.slice(0, 8)}...`,
      action: {
        label: 'View',
        onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=localnet`, '_blank')
      }
    })
  }
}