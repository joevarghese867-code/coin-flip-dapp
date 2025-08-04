'use client'

import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import BN from 'bn.js'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { SendTransactionError } from '@solana/web3.js'
import { IDL, PROGRAM_ID } from '@/lib/idl'

const LAMPORTS_PER_SOL = 1_000_000_000

function getCoinFlipProgram(provider: AnchorProvider) {
  return new Program(IDL, provider);
}

function getCoinFlipProgramId(): PublicKey {
  return new PublicKey(PROGRAM_ID)
}

async function getTransactionLogs(error: any, connection: any) {
  if (error instanceof SendTransactionError) {
    try {
      return await error.getLogs(connection)
    } catch {
      return null
    }
  }
  return error.logs || null
}

interface InitializeArgs {
  fee_percentage: number
}

interface DepositArgs {
  amount: number
}

interface WithdrawArgs {
  amount: number
}

export function useCoinFlipProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const transactionToast = useTransactionToast()

  const programId = useMemo(() => getCoinFlipProgramId(), [])
  const program = useMemo(() => getCoinFlipProgram(provider), [provider])

  // Get the global game state PDA
  const [globalGameState] = useMemo(() => PublicKey.findProgramAddressSync(
    [Buffer.from('global_gamestate')],
    programId
  ), [programId])

  const accounts = useQuery({
    queryKey: ['coin_flip', 'all', { cluster }],
    queryFn: () => (program.account as any).gameState.all(),
  })

  // Query for the global game state specifically
  const globalGameStateQuery = useQuery({
    queryKey: ['coin_flip', 'global_gamestate', { cluster }],
    queryFn: async () => {
      try {
        return await (program.account as any).gameState.fetch(globalGameState)
      } catch (error: any) {
        if (error.message?.includes('Account does not exist')) {
          return null
        }
        throw error
      }
    },
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation<string, Error, InitializeArgs>({
    mutationKey: ['game_state', 'initialize', { cluster }],
    mutationFn: async ({ fee_percentage }) => {
      try {
        return await (program.methods as any)
          .initialize(new BN(fee_percentage))
          .accounts({
            authority: provider.wallet.publicKey,
            gameState: globalGameState,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      } catch (error: any) {
        await getTransactionLogs(error, connection)
        throw error
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      accounts.refetch()
      globalGameStateQuery.refetch()
    },
    onError: async (error) => {
      await getTransactionLogs(error, connection)
      toast.error(`Failed to initialize: ${error.message}`)
    },
  })

  const deposit_to_gamestate = useMutation<string, Error, DepositArgs>({
    mutationKey: ['game_state', 'deposit', { cluster }],
    mutationFn: async ({ amount }) => {
      try {
        return await (program.methods as any)
          .deposit(new BN(amount))
          .accounts({ 
            authority: provider.wallet.publicKey,
            gameState: globalGameState, 
            systemProgram: SystemProgram.programId 
          })
          .rpc()
      } catch (error: any) {
        await getTransactionLogs(error, connection)
        throw error
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      accounts.refetch()
      globalGameStateQuery.refetch()
    },
    onError: async (error) => {
      await getTransactionLogs(error, connection)
      toast.error(`Failed to deposit: ${error.message}`)
    },
  })

  const withdraw = useMutation<string, Error, WithdrawArgs>({
    mutationKey: ['game_state', 'withdraw', { cluster }],
    mutationFn: async ({ amount }) => {
      try {
        return await (program.methods as any)
          .withdraw(new BN(amount))
          .accounts({  
            authority: provider.wallet.publicKey,
            gameState: globalGameState, 
            systemProgram: SystemProgram.programId 
          })
          .rpc()
      } catch (error: any) {
        await getTransactionLogs(error, connection)
        throw error
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      accounts.refetch()
      globalGameStateQuery.refetch()
    },
    onError: async (error) => {
      await getTransactionLogs(error, connection)
      toast.error(`Failed to withdraw: ${error.message}`)
    },
  })

  return {
    program,
    programId,
    accounts,
    globalGameState,
    globalGameStateQuery,
    getProgramAccount,
    initialize,
    deposit_to_gamestate,
    withdraw,
  }
}

export function useCoinFlipProgramAccount({
  user,
  gameNumber
}: {
  user: PublicKey
  gameNumber?: number
}) {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, globalGameState, globalGameStateQuery } = useCoinFlipProgram()

  const currentGameNumber = useMemo(() => 
    gameNumber !== undefined ? gameNumber : (globalGameStateQuery.data?.totalGames?.toNumber() || 0), 
    [gameNumber, globalGameStateQuery.data?.totalGames]
  )

  const [betAccount] = useMemo(() => {
    const gameNumber = globalGameStateQuery.data?.totalGames?.toNumber() || 0
    const gameNumberBuf = new BN(gameNumber).toArrayLike(Buffer, 'le', 8)
    return PublicKey.findProgramAddressSync(
      [Buffer.from('bet_account'), user.toBuffer(), gameNumberBuf],
      (program as any).programId
    )
  }, [user, globalGameStateQuery.data?.totalGames, program])

  const placeBet = useMutation<string, Error, { amount: number; choice: number }>({
    mutationKey: ['bet_account', 'place_bet', { cluster, betAccount: betAccount.toString() }],
    mutationFn: async ({ amount, choice }) => {
      if (![0, 1].includes(choice)) throw new Error('Choice must be 0 or 1')
      if (user.equals(new PublicKey('11111111111111111111111111111111'))) throw new Error('Invalid user public key')
     
      const gameStateData = await (program.account as any).gameState.fetch(globalGameState)
       
      const payout = amount * 2
      const fee = Math.floor((payout * gameStateData.feePercentage.toNumber()) / 100)
      const userWinnings = payout - fee

      if (userWinnings > gameStateData.totalAmount.toNumber()) {
        throw new Error(`Insufficient funds in game state. Available: ${gameStateData.totalAmount.toString()}, Required: ${userWinnings}`)
      }

      return await (program.methods as any)
        .placeBet(new BN(amount), choice)
        .accounts({
          user,
          gameState: globalGameState,
          betAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await globalGameStateQuery.refetch()
    },
    onError: async (error) => {
      await getTransactionLogs(error, connection)
      toast.error(`Failed to place bet: ${error.message}`)
    },
  })

  const accountQuery = useQuery({
    queryKey: ['bet_account', 'fetch', { cluster, betAccount: betAccount.toString(), gameNumber: currentGameNumber }],
    queryFn: async () => {
      try {
        return await (program.account as any).betAccount.fetch(betAccount)
      } catch (error: any) {
        if (error.message?.includes('Account does not exist')) {
          return null
        }
        throw error
      }
    },
    enabled: !!program && !!betAccount && !!globalGameStateQuery.data,
    retry: false,
  })

  return {
    placeBet,
    currentGameNumber,
    gameStateData: globalGameStateQuery.data,
    gameState: globalGameState,
    betAccount,
    accountQuery,
  }
}