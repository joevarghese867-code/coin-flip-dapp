import { Header } from '@/components/layout/Header'
import './globals.css'
import { Providers } from '@/components/providers/Provider'
import { Footer } from '@/components/layout/Footer'
import { WalletButton } from '@/components/wallet/WalletButton'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
            <Header/>
          {children}
        </Providers>
        <Footer/>
        
      </body>
    </html>
  )
}