'use client'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

/*
function AirdropButton() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [isAirdropping, setIsAirdropping] = useState(false)

 
  const handleAirdrop = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsAirdropping(true)
    try {
      console.log('Requesting airdrop for:', publicKey.toString())
      
      // Check current balance
      const currentBalance = await connection.getBalance(publicKey)
      console.log('Current balance:', currentBalance / LAMPORTS_PER_SOL, 'SOL')
      
      // Request 2 SOL airdrop
      const signature = await connection.requestAirdrop(
        publicKey,
        2 * LAMPORTS_PER_SOL
      )
      
      // Wait for confirmation
      await connection.confirmTransaction(signature)
      
      // Check new balance
      const newBalance = await connection.getBalance(publicKey)
      console.log('New balance:', newBalance / LAMPORTS_PER_SOL, 'SOL')
      
      toast.success(`Airdropped 2 SOL! New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL`)
    } catch (error: any) {
      console.error('Airdrop failed:', error)
      toast.error(`Airdrop failed: ${error.message}`)
    } finally {
      setIsAirdropping(false)
    }
  }

  if (!publicKey) {
    return null
  }

  return (
    <button
      onClick={handleAirdrop}
      disabled={isAirdropping}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isAirdropping ? 'Airdropping...' : 'Airdrop 2 SOL'}
    </button>
  )
}
*/
export function WalletButton() {
  const [mounted, setMounted] = useState(false)

  // Ensure component only renders after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder that matches the server-rendered HTML
    return (
      <div className="flex justify-end items-center gap-2 p-4">
        <button className="px-4 py-2 bg-gray-300 rounded" disabled>
          Loading...
        </button>
        <button className="btn-primary" disabled>
          Loading...
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-end items-center gap-2 p-4">
     
      <WalletMultiButton className="btn-primary" />
    </div>
  )
}