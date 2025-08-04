'use client'

import { useState, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Crown, Menu, X } from 'lucide-react'
import { useCoinFlipProgram } from '../coin-flip/coin-flip-data-access'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { WalletButton } from '../wallet/WalletButton'

export function Header() {
  const wallet = useWallet()
  const router = useRouter()
  const { globalGameStateQuery } = useCoinFlipProgram()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Check if connected wallet is the global game authority
  const isAuthority = useMemo(() => {
    if (!wallet.publicKey || !globalGameStateQuery.data) return false
    return globalGameStateQuery.data.authority.equals(wallet.publicKey)
  }, [wallet.publicKey, globalGameStateQuery.data])

  const handleAdminAccess = () => {
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet first')
      return
    }
    
    if (!globalGameStateQuery.data) {
      toast.error('Game state not found. The game may not be initialized yet.')
      return
    }
    
    if (!isAuthority) {
      toast.error('Access denied. Only the game authority can access admin panel.')
      return
    }
    
    router.push('/admin')
  }

  return (
    <>
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-xl border-b border-blue-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center space-x-3 hover:opacity-80 transition-all duration-200 hover:scale-105"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-blue-800 font-bold text-xl">J</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white">
                    JUMBA CREATIONS
                  </span>
                </div>
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Admin Button - Only show if user is the authority */}
              {isAuthority && (
                <Button
                  onClick={handleAdminAccess}
                  variant="outline"
                  className="flex items-center gap-2 border-blue-300/40 text-white hover:bg-blue-500/20 hover:border-blue-300/60 bg-blue-500/10 backdrop-blur-sm transition-all duration-200"
                >
                  <Crown className="h-4 w-4" />
                  Admin Panel
                </Button>
              )}

              {/* Admin Button - Show for everyone if game not initialized yet */}
              {!globalGameStateQuery.data && !globalGameStateQuery.isLoading && wallet.publicKey && (
                <Button
                  onClick={() => router.push('/admin')}
                  variant="outline"
                  className="flex items-center gap-2 border-cyan-300/40 text-white hover:bg-cyan-500/20 hover:border-cyan-300/60 bg-cyan-500/10 backdrop-blur-sm transition-all duration-200"
                >
                  <Crown className="h-4 w-4" />
                  Initialize Game
                </Button>
              )}

              {/* Wallet Button */}
              <div className="ml-2">
                <WalletButton />
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-white hover:bg-blue-500/20 hover:text-blue-100 transition-all duration-200"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-blue-500/30 bg-gradient-to-r from-blue-900/95 via-blue-800/95 to-blue-900/95 backdrop-blur-sm">
            <div className="px-4 py-4 space-y-3">
              {/* Admin Button - Only show if user is the authority */}
              {isAuthority && (
                <Button
                  onClick={handleAdminAccess}
                  variant="outline"
                  className="w-full flex items-center gap-2 border-blue-300/40 text-white hover:bg-blue-500/20 hover:border-blue-300/60 bg-blue-500/10 backdrop-blur-sm transition-all duration-200"
                >
                  <Crown className="h-4 w-4" />
                  Admin Panel
                </Button>
              )}

              {/* Admin Button - Show for everyone if game not initialized yet */}
              {!globalGameStateQuery.data && !globalGameStateQuery.isLoading && wallet.publicKey && (
                <Button
                  onClick={() => router.push('/admin')}
                  variant="outline"
                  className="w-full flex items-center gap-2 border-cyan-300/40 text-white hover:bg-cyan-500/20 hover:border-cyan-300/60 bg-cyan-500/10 backdrop-blur-sm transition-all duration-200"
                >
                  <Crown className="h-4 w-4" />
                  Initialize Game
                </Button>
              )}

              <div className="pt-2">
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  )
}