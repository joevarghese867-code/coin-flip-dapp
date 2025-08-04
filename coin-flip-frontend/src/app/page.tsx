import { WalletButton } from '@/components/wallet/WalletButton'
import CoinFlip from '@/components/coin-flip/coin-flip-ui'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <CoinFlip />
      </div>
    </main>
  )
}