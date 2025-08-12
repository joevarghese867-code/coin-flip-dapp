// src/components/coin-flip/CoinFlipGame.tsx
'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { useCoinFlipProgram, useCoinFlipProgramAccount } from './coin-flip-data-access'
import { Button } from '@/components/ui/button'
import { useWallet } from '@solana/wallet-adapter-react'
import { Coins, Trophy, Target, TrendingUp, History, Clock, Loader2 } from 'lucide-react'
import CoinFlipAnimation from './CoinFlipAnimation'
import BN from 'bn.js'
import { useQuery } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'

const LAMPORTS_PER_SOL = 1_000_000_000

function formatWalletAddress(address: string, chars = 4) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

// Global state to track when bets are being resolved
let globalBetResolutionState = {
  isResolving: false,
  setBetResolving: (resolving: boolean) => {
    globalBetResolutionState.isResolving = resolving
  }
}

function TopWinnersToday() {
  const { connection } = useConnection()
  const { program } = useCoinFlipProgram()
  
  const topWinners = useQuery({
    queryKey: ['top-winners-recent'],
    queryFn: async () => {
      if (!program) return []
      
      try {
        const betAccounts = await (program.account as any).betAccount.all()
        
        const winningBets = betAccounts
          .filter((bet: any) => {
            return bet.account.settled && bet.account.won
          })
          .map((bet: any) => ({
            user: bet.account.user.toString(),
            amount: bet.account.amount.toNumber() / LAMPORTS_PER_SOL,
            choice: bet.account.choice,
            gameNumber: bet.account.gameNumber?.toNumber() || 0
          }))
        
        const recentWinningBets = winningBets
          .sort((a: { gameNumber: number }, b: { gameNumber: number }) => b.gameNumber - a.gameNumber)
          .slice(0, 20)
        
        const userWinnings = recentWinningBets.reduce((acc: any, bet: any) => {
          const userKey = bet.user
          if (!acc[userKey]) {
            acc[userKey] = {
              user: userKey,
              totalWinnings: 0,
              gamesWon: 0,
              lastGameNumber: 0
            }
          }
          acc[userKey].totalWinnings += bet.amount
          acc[userKey].gamesWon += 1
          acc[userKey].lastGameNumber = Math.max(acc[userKey].lastGameNumber, bet.gameNumber)
          return acc
        }, {})
        
        const sortedWinners = Object.values(userWinnings)
          .sort((a: any, b: any) => {
            if (b.totalWinnings !== a.totalWinnings) {
              return b.totalWinnings - a.totalWinnings
            }
            return b.lastGameNumber - a.lastGameNumber
          })
          .slice(0, 4)
          .map((winner: any, index: number) => ({
            rank: index + 1,
            player: formatWalletAddress(winner.user),
            winnings: winner.totalWinnings,
            gamesWon: winner.gamesWon
          }))
        
        return sortedWinners
      } catch (error) {
        return []
      }
    },
    enabled: !!program,
    refetchInterval: 30000,
  })

  if (topWinners.isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Recent Top Winners
        </h3>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
        <Trophy className="w-5 h-5 text-yellow-600" />
        Recent Top Winners
      </h3>
      
      {!topWinners.data || topWinners.data.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No recent winners</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topWinners.data.map((winner: any) => (
            <div key={winner.rank} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  winner.rank === 1 ? 'bg-yellow-500' : 
                  winner.rank === 2 ? 'bg-gray-400' : 
                  winner.rank === 3 ? 'bg-orange-500' : 'bg-gray-600'
                }`}>
                  {winner.rank}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">{winner.player}</span>
                  <div className="text-xs text-gray-500">{winner.gamesWon} wins</div>
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600">
                +{winner.winnings.toFixed(2)} SOL
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RecentActivityList() {
  const { connection } = useConnection()
  const { program } = useCoinFlipProgram()
  
  const recentBets = useQuery({
    queryKey: ['recent-bets'],
    queryFn: async () => {
      if (!program) return []
      
      try {
        const betAccounts = await (program.account as any).betAccount.all()
        
        const sortedBets = betAccounts
          .filter((bet: any) => bet.account.settled)
          .sort((a: any, b: any) => {
            return b.account.slot || 0 - (a.account.slot || 0)
          })
          .slice(0, 8)
          .map((bet: any) => ({
            id: bet.publicKey.toString(),
            player: formatWalletAddress(bet.account.user.toString()),
            amount: bet.account.amount.toNumber() / LAMPORTS_PER_SOL,
            choice: bet.account.choice === 0 ? 'Heads' : 'Tails',
            won: bet.account.won,
          }))
        
        return sortedBets
      } catch (error) {
        return []
      }
    },
    enabled: !!program,
    refetchInterval: 30000,
  })

  if (recentBets.isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-300 rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!recentBets.data || recentBets.data.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recentBets.data.map((game: any) => (
        <div key={game.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${game.won ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <div>
              <p className="text-sm font-medium text-gray-900">{game.player}</p>
              <p className="text-xs text-gray-500">{game.choice}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${game.won ? 'text-green-600' : 'text-red-600'}`}>
              {game.won ? '+' : '-'}{game.amount.toFixed(2)} SOL
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function BettingInterface() {
  const wallet = useWallet()
  const { connection } = useConnection()
  const { globalGameStateQuery, globalGameState, program, programId } = useCoinFlipProgram()
  
  const [betChoice, setBetChoice] = useState<number>(0)
  const [placeBetAmount, setPlaceBetAmount] = useState<number>(0)
  const [betResult, setBetResult] = useState<null | 'won' | 'lost' | 'pending'>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationResult, setAnimationResult] = useState<'heads' | 'tails' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null)

  const gameStateData = globalGameStateQuery.data

  const betAccountQuery = useCoinFlipProgramAccount({
    user: wallet.publicKey || new PublicKey('11111111111111111111111111111111'),
    gameNumber: gameStateData?.totalGames?.toNumber()
  })

  const potentialWinnings = useMemo(() => {
    if (!placeBetAmount || !gameStateData) return 0
    const payout = placeBetAmount * 2
    const fee = (payout * gameStateData.feePercentage.toNumber()) / 100
    return payout - fee
  }, [placeBetAmount, gameStateData])

  const existingBetInfo = useMemo(() => {
    const betData = betAccountQuery.accountQuery.data
    if (!betData?.settled) return null
    
    return {
      amount: betData.amount.toNumber() / LAMPORTS_PER_SOL,
      choice: betData.choice === 0 ? 'Heads' : 'Tails',
      won: betData.won
    }
  }, [betAccountQuery.accountQuery.data])

  // Improved bet result checking with better error handling
  const checkBetResult = useCallback(async (gameNumber: number, signature: string) => {
    if (!wallet.publicKey || !program || !programId || !connection) return

    console.log(`Starting bet result check for game ${gameNumber} with signature ${signature}`)

    // First, wait for transaction confirmation
    try {
      console.log('Waiting for transaction confirmation...')
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed')
      console.log('Transaction confirmed')
    } catch (confirmError) {
      console.log('Transaction confirmation error:', confirmError)
      // Continue anyway, the transaction might still be processed
    }

    const gameNumberBuf = new BN(gameNumber).toArrayLike(Buffer, 'le', 8)
    const [correctBetAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('bet_account'), wallet.publicKey.toBuffer(), gameNumberBuf],
      programId
    )

    let attempts = 0
    const maxAttempts = 20 // Increased attempts for devnet
    let lastError: any = null

    const attemptFetch = async () => {
      attempts++
      console.log(`Fetch attempt ${attempts}/${maxAttempts}`)
      
      try {
        // Add a small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const betData = await (program.account as any).betAccount.fetch(correctBetAccount)
        console.log('Fetched bet data:', {
          settled: betData?.settled,
          won: betData?.won,
          choice: betData?.choice
        })
        
        if (betData?.settled) {
          // Determine the actual coin flip result based on whether the user won
          const coinResult = betData.won 
            ? (betChoice === 0 ? 'heads' : 'tails')  // User won, coin landed on their choice
            : (betChoice === 0 ? 'tails' : 'heads')  // User lost, coin landed opposite
          
          console.log(`Bet settled! User ${betData.won ? 'won' : 'lost'}. Coin result: ${coinResult}`)
          
          setAnimationResult(coinResult)
          setBetResult(betData.won ? 'won' : 'lost')
          setIsProcessing(false)
          
          // Refetch game state data
          globalGameStateQuery.refetch()
          betAccountQuery.accountQuery.refetch()
          
          return
        }
        
        if (attempts < maxAttempts) {
          console.log(`Bet not settled yet, retrying in 2 seconds...`)
          setTimeout(attemptFetch, 2000)
        } else {
          console.log('Max attempts reached, giving up')
          throw new Error('Max fetch attempts reached')
        }
      } catch (error) {
        lastError = error
        console.log(`Fetch error on attempt ${attempts}:`, error)
        
        if (attempts < maxAttempts) {
          console.log(`Retrying in 3 seconds...`)
          setTimeout(attemptFetch, 3000)
        } else {
          console.log('Max attempts reached with errors')
          throw error
        }
      }
    }

    try {
      // Start checking after a short delay to allow transaction processing
      setTimeout(attemptFetch, 2000)
    } catch (error) {
      console.error('Failed to check bet result:', error)
      setBetResult(null)
      setShowAnimation(false)
      setIsProcessing(false)
      globalBetResolutionState.setBetResolving(false)
      
      // Show a fallback message to check balance manually
      alert('Transaction completed but result check failed. Please refresh the page to see your result.')
    }
  }, [wallet.publicKey, program, programId, connection, betChoice, globalGameStateQuery, betAccountQuery.accountQuery])

  useEffect(() => {
    if (betResult === 'won' || betResult === 'lost') {
      const timer = setTimeout(() => {
        setShowAnimation(false)
        setBetResult(null)
        setAnimationResult(null)
        setTransactionSignature(null)
        globalBetResolutionState.setBetResolving(false)
      }, 8000)
      
      return () => clearTimeout(timer)
    }
  }, [betResult])

  const handlePlaceBet = async () => {
    if (!wallet.publicKey || !placeBetAmount || placeBetAmount <= 0) {
      return
    }

    console.log('Starting bet placement...')
    setIsProcessing(true)
    setShowAnimation(true)
    setAnimationResult(null)
    setBetResult('pending')
    setTransactionSignature(null)
    globalBetResolutionState.setBetResolving(true)
    
    const amountLamports = placeBetAmount * LAMPORTS_PER_SOL

    try {
      const gameNumberForBet = betAccountQuery.currentGameNumber
      console.log(`Placing bet for game number: ${gameNumberForBet}`)
      
      const signature = await betAccountQuery.placeBet.mutateAsync({
        amount: amountLamports,
        choice: betChoice
      })
      
      console.log(`Bet transaction submitted with signature: ${signature}`)
      setTransactionSignature(signature)
      
      // Start checking for result
      checkBetResult(gameNumberForBet, signature)
    } catch (error) {
      console.error('Bet placement failed:', error)
      setBetResult(null)
      setShowAnimation(false)
      setIsProcessing(false)
      setTransactionSignature(null)
      globalBetResolutionState.setBetResolving(false)
    }
  }

  if (!gameStateData) {
    return <div className="text-center py-8 bg-white rounded-2xl shadow-lg">Loading game...</div>
  }

  return (
    <div className="space-y-6">
      {existingBetInfo && !showAnimation && (
        <div className={`text-center p-6 rounded-2xl shadow-lg ${
          existingBetInfo.won 
            ? 'bg-green-50 border-2 border-green-200' 
            : 'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="text-4xl mb-2">
            {existingBetInfo.won ? '🎉' : '😢'}
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-800">
            {existingBetInfo.won ? 'You Won!' : 'You Lost!'}
          </h3>
          <p className="text-gray-700">
            You bet {existingBetInfo.amount.toFixed(4)} SOL on {existingBetInfo.choice}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 text-center border-b">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🪙 Coin Flip Game</h1>
          <p className="text-gray-600">Double your SOL or lose it all!</p>
        </div>

        <div className="p-8">
          <div className="max-w-md mx-auto space-y-6">
            {showAnimation && (
              <div className="space-y-4">
                <CoinFlipAnimation 
                  isFlipping={betResult === 'pending' || !!animationResult}
                  result={animationResult}
                  userBet={betChoice === 0 ? 'heads' : 'tails'}
                  onAnimationComplete={() => {}}
                />
                
                {/* Transaction status */}
                {transactionSignature && (
                  <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Transaction: <code className="text-xs">{transactionSignature.slice(0, 8)}...{transactionSignature.slice(-8)}</code>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {isProcessing ? 'Processing...' : 'Completed!'}
                    </p>
                  </div>
                )}
                
                {/* Backup message if taking too long */}
                {isProcessing && betResult === 'pending' && (
                  <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Taking longer than expected? Check your wallet balance after the animation completes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!showAnimation && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Bet Amount
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0.0"
                      value={placeBetAmount || ''}
                      onChange={(e) => setPlaceBetAmount(Number(e.target.value))}
                      disabled={betAccountQuery.placeBet.isPending}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-lg font-medium text-gray-600">SOL</span>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    {[0.1, 0.5, 1.0].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setPlaceBetAmount(amount)}
                        disabled={betAccountQuery.placeBet.isPending}
                        className="flex-1 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        {amount} SOL
                      </button>
                    ))}
                  </div>
                </div>

                {placeBetAmount > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center">
                    <p className="text-lg font-semibold text-yellow-800">
                      Potential Winnings: {potentialWinnings.toFixed(4)} SOL
                    </p>
                    <p className="text-sm text-yellow-700">
                      2x your bet minus {gameStateData.feePercentage.toString()}% house fee
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 text-center">
                    Choose Your Side
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setBetChoice(0)}
                      disabled={betAccountQuery.placeBet.isPending}
                      className={`p-6 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        betChoice === 0
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-4xl mb-2">🪙</div>
                      <div className="font-semibold">Heads</div>
                    </button>
                    
                    <button
                      onClick={() => setBetChoice(1)}
                      disabled={betAccountQuery.placeBet.isPending}
                      className={`p-6 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        betChoice === 1
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-4xl mb-2">🎯</div>
                      <div className="font-semibold">Tails</div>
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceBet}
                  disabled={betAccountQuery.placeBet.isPending || !placeBetAmount || placeBetAmount <= 0 || !wallet.publicKey}
                  className="w-full py-4 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {betAccountQuery.placeBet.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    '🎲 Flip the Coin!'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function GameStats({ gameData }: { gameData: any }) {
  const [isBetResolving, setIsBetResolving] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBetResolving(globalBetResolutionState.isResolving)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        Game Statistics
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Games</span>
          <span className="font-semibold text-gray-900">
            {gameData.totalGames.toString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Vault Balance</span>
          {isBetResolving ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="font-semibold text-blue-600 text-sm">Updating...</span>
            </div>
          ) : (
            <span className="font-semibold text-green-600">
              {(gameData.totalAmount.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">House Fee</span>
          <span className="font-semibold text-purple-600">
            {gameData.feePercentage.toString()}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Win Rate</span>
          <span className="font-semibold text-orange-600">50%</span>
        </div>
      </div>
    </div>
  )
}

export default function CoinFlipGame() {
  const wallet = useWallet()
  const { globalGameStateQuery, getProgramAccount } = useCoinFlipProgram()

  if (!wallet.publicKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Coins className="h-20 w-20 text-gray-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Coin Flip Game</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to start playing!</p>
        </div>
      </div>
    )
  }

  if (getProgramAccount.isLoading || globalGameStateQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex justify-center py-8">Loading...</div>
      </div>
    )
  }
  
  if (!getProgramAccount.data?.value) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12 bg-white rounded-xl shadow-lg max-w-md mx-auto">
          <Coins className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Program Not Found</h3>
          <p className="text-gray-500">Make sure the program is deployed.</p>
        </div>
      </div>
    )
  }

  if (!globalGameStateQuery.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12 bg-white rounded-xl shadow-lg max-w-md mx-auto">
          <Coins className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Game Not Initialized</h3>
          <p className="text-gray-500">The global game state hasn't been created yet. Contact an admin to initialize the game.</p>
        </div>
      </div>
    )
  }

  const gameData = globalGameStateQuery.data

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <GameStats gameData={gameData} />

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">How to Play</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">1</div>
                  <p className="text-sm text-gray-600">Choose your bet amount in SOL</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">2</div>
                  <p className="text-sm text-gray-600">Pick Heads (🪙) or Tails (🎯)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">3</div>
                  <p className="text-sm text-gray-600">Win 2x your bet minus house fee</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Tip:</strong> Start with smaller bets to get familiar with the game!
                </p>
              </div>
            </div>

            <TopWinnersToday />
          </div>

          <div className="col-span-12 lg:col-span-6">
            <BettingInterface />
          </div>

          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                <History className="w-5 h-5 text-green-600" />
                Recent Activity
              </h3>
              <RecentActivityList />
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">💡 Pro Tips</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Set a budget and stick to it</li>
                <li>• Each flip is independent (50/50)</li>
                <li>• Consider the house fee in your strategy</li>
                <li>• Take breaks between sessions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
