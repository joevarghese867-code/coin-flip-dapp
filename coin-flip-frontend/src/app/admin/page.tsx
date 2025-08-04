'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo, useState, useEffect } from 'react'
import { ExplorerLink } from '../../components/cluster/cluster-ui'
import { useCoinFlipProgram } from '../../components/coin-flip/coin-flip-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { useWallet } from '@solana/wallet-adapter-react'
import { Settings, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'

const LAMPORTS_PER_SOL = 1_000_000_000

export function AdminGameCreate() {
  const { initialize, globalGameStateQuery } = useCoinFlipProgram()
  const wallet = useWallet()
  const [feePercentage, setFeePercentage] = useState(5)

  const gameStateExists = !!globalGameStateQuery.data

  const handleInitialize = () => {
    if (!wallet.publicKey || gameStateExists) return
    initialize.mutateAsync({ fee_percentage: feePercentage })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Initialize Global Game State
        </CardTitle>
        <CardDescription>Create the global coin flip game instance (one-time setup)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">House Fee:</label>
            <input
              type="number"
              min={0}
              max={100}
              value={feePercentage}
              onChange={(e) => setFeePercentage(Number(e.target.value))}
              className="w-20 px-3 py-2 border rounded-md"
              disabled={gameStateExists}
            />
            <span className="text-sm">%</span>
          </div>
          
          <Button 
            onClick={handleInitialize} 
            disabled={initialize.isPending || gameStateExists}
            className="w-full"
          >
            {initialize.isPending ? 'Initializing...' : 
             gameStateExists ? 'Global Game State Already Exists' : 
             'Initialize Global Game State'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminGameManagement() {
  const { globalGameStateQuery, globalGameState, deposit_to_gamestate, withdraw } = useCoinFlipProgram()
  const wallet = useWallet()
  const [vaultAmount, setVaultAmount] = useState<number>(0)

  const gameData = globalGameStateQuery.data
  
  // Check if current wallet is the authority
  const isAuthorized = useMemo(() => {
    if (!wallet.publicKey || !gameData) return false
    return gameData.authority.equals(wallet.publicKey)
  }, [wallet.publicKey, gameData])

  useEffect(() => {
    if (deposit_to_gamestate.isSuccess || withdraw.isSuccess) {
      setVaultAmount(0)
    }
  }, [deposit_to_gamestate.isSuccess, withdraw.isSuccess])

  const handleVaultOperation = async (operation: 'deposit' | 'withdraw') => {
    if (!wallet.publicKey || !vaultAmount || vaultAmount <= 0) return

    const amountLamports = vaultAmount * LAMPORTS_PER_SOL
    
    try {
      if (operation === 'deposit') {
        await deposit_to_gamestate.mutateAsync({ amount: amountLamports })
      } else {
        await withdraw.mutateAsync({ amount: amountLamports })
      }
    } catch (error) {
      // Error handling is done in the mutation onError callback
    }
  }

  if (!gameData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-600">No global game state found. Please initialize one first.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isAuthorized) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unauthorized Access</h3>
            <p className="text-gray-600 mb-4">
              You are not the authority for this game state.
            </p>
            <div className="text-sm text-gray-500">
              <p>Current Authority: <span className="font-mono">{ellipsify(gameData.authority.toString())}</span></p>
              <p>Your Wallet: <span className="font-mono">{ellipsify(wallet.publicKey?.toString() || '')}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Global Game Statistics
          </CardTitle>
          <CardDescription>
            <ExplorerLink 
              path={`account/${globalGameState}`} 
              label={ellipsify(globalGameState.toString())}
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {gameData.totalGames.toString()}
              </div>
              <div className="text-sm text-blue-700">Total Games</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {(gameData.totalAmount.toNumber() / LAMPORTS_PER_SOL).toFixed(4)}
              </div>
              <div className="text-sm text-green-700">Vault Balance (SOL)</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {gameData.feePercentage.toString()}%
              </div>
              <div className="text-sm text-purple-700">House Fee</div>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {ellipsify(gameData.authority.toString())}
              </div>
              <div className="text-sm text-orange-700">Authority</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Vault Management
          </CardTitle>
          <CardDescription>Deposit or withdraw funds from the global game vault</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.1}
                placeholder="Amount in SOL"
                value={vaultAmount || ''}
                onChange={(e) => setVaultAmount(Number(e.target.value))}
                disabled={deposit_to_gamestate.isPending || withdraw.isPending}
                className="flex-1 px-3 py-2 border rounded-md text-gray-900"
              />
              <span className="text-sm text-gray-700">SOL</span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => handleVaultOperation('deposit')} 
                disabled={deposit_to_gamestate.isPending || withdraw.isPending || !vaultAmount}
                className="flex-1"
              >
                {deposit_to_gamestate.isPending ? 'Depositing...' : 'Deposit'}
              </Button>
              
              <Button 
                onClick={() => handleVaultOperation('withdraw')} 
                disabled={withdraw.isPending || deposit_to_gamestate.isPending || !vaultAmount}
                variant="destructive" 
                className="flex-1"
              >
                {withdraw.isPending ? 'Withdrawing...' : 'Withdraw'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminPage() {
  const { globalGameStateQuery, getProgramAccount } = useCoinFlipProgram()
  const wallet = useWallet()

  if (!wallet.publicKey) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
          <p className="text-gray-600">Please connect your wallet to access admin features.</p>
        </div>
      </div>
    )
  }

  if (getProgramAccount.isLoading || globalGameStateQuery.isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center py-8">Loading...</div>
      </div>
    )
  }
  
  if (!getProgramAccount.data?.value) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
          <p>Program account not found. Make sure you have deployed the program.</p>
        </div>
      </div>
    )
  }

  const gameStateExists = !!globalGameStateQuery.data

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage the global coin flip game instance</p>
      </div>

      {!gameStateExists ? (
        <AdminGameCreate />
      ) : (
        <AdminGameManagement />
      )}
    </div>
  )
}