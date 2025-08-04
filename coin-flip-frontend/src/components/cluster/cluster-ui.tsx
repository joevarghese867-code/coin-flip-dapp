import { ReactNode } from 'react'

interface ExplorerLinkProps {
  path: string
  label: ReactNode
  className?: string
}

export function ExplorerLink({ path, label, className }: ExplorerLinkProps) {
  const baseUrl = 'https://explorer.solana.com'
  return (
    <a 
      href={`${baseUrl}/${path}?cluster=devnet`}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-blue-600 hover:text-blue-800 underline ${className}`}
    >
      {label}
    </a>
  )
}