// src/components/coin-flip/CoinFlipAnimation.tsx
'use client'

import { useEffect, useState } from 'react'

interface CoinFlipAnimationProps {
  isFlipping: boolean
  result: 'heads' | 'tails' | null
  userBet?: 'heads' | 'tails' | null
  onAnimationComplete?: () => void
}

export default function CoinFlipAnimation({ 
  isFlipping, 
  result, 
  userBet,
  onAnimationComplete 
}: CoinFlipAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'confirming' | 'flipping' | 'settling' | 'complete'>('idle')
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    // Start animation immediately when isFlipping becomes true
    if (isFlipping && animationPhase === 'idle') {
      setAnimationPhase('confirming')
      setShowResult(false)
    }
    
    // When result becomes available, transition to flipping phase
    if (isFlipping && result && animationPhase === 'confirming') {
      setAnimationPhase('flipping')
      
      // After 4 seconds of flipping, start settling
      setTimeout(() => {
        setAnimationPhase('settling')
      }, 4000)
      
      // After settling, show final result
      setTimeout(() => {
        setAnimationPhase('complete')
        setShowResult(true)
        onAnimationComplete?.()
      }, 5500)
    }
    
    // Reset when not flipping
    if (!isFlipping && animationPhase !== 'idle') {
      setAnimationPhase('idle')
      setShowResult(false)
    }
  }, [isFlipping, result, animationPhase, onAnimationComplete])

  const getCoinClasses = () => {
    const baseClasses = "relative w-20 h-20 mx-auto transition-all duration-300"
    
    switch (animationPhase) {
      case 'confirming':
        return `${baseClasses} animate-pulse scale-105`
      case 'flipping':
        return `${baseClasses} animate-bounce scale-110`
      case 'settling':
        return `${baseClasses} scale-105`
      case 'complete':
        return `${baseClasses} scale-125 shadow-2xl`
      default:
        return `${baseClasses} scale-100`
    }
  }

  const getCoinStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      transformStyle: 'preserve-3d' as const
    }

    if (animationPhase === 'confirming') {
      return {
        ...baseStyle,
        filter: 'drop-shadow(0 0 15px rgba(147, 51, 234, 0.6))'
      }
    }

    if (animationPhase === 'flipping') {
      return {
        ...baseStyle,
        animation: 'coinFlip 0.3s linear infinite',
        filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.6))'
      }
    }
    
    if (animationPhase === 'settling' && result) {
      const finalRotation = result === 'heads' ? 0 : 180
      return {
        ...baseStyle,
        transform: `rotateY(${finalRotation}deg)`,
        transition: 'transform 1.5s ease-out'
      }
    }
    
    if (animationPhase === 'complete' && result) {
      const finalRotation = result === 'heads' ? 0 : 180
      return {
        ...baseStyle,
        transform: `rotateY(${finalRotation}deg)`,
        filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8))'
      }
    }
    
    return baseStyle
  }

  // Don't render anything if idle
  if (animationPhase === 'idle') {
    return null
  }

  return (
    <div className="relative">
      {/* CSS Animation Styles */}
      <style jsx>{`
        @keyframes coinFlip {
          0% { transform: rotateY(0deg); }
          25% { transform: rotateY(90deg); }
          50% { transform: rotateY(180deg); }
          75% { transform: rotateY(270deg); }
          100% { transform: rotateY(360deg); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8); }
        }
        
        .coin-container {
          perspective: 1000px;
        }
        
        .coin-glow {
          animation: glow 1.5s ease-in-out infinite;
        }
        
        .coin-3d {
          transform-style: preserve-3d;
          position: relative;
        }
        
        .coin-face {
          backface-visibility: hidden;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .coin-back {
          backface-visibility: hidden;
          transform: rotateY(180deg);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>

      <div className="text-center py-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 mb-6">
        {/* Coin Container */}
        <div className="coin-container">
          <div 
            className={`${getCoinClasses()} coin-3d`}
            style={getCoinStyle()}
          >
            {/* Coin Front (Heads) */}
            <div className="coin-face rounded-full border-4 border-yellow-400 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg flex items-center justify-center text-3xl">
              🪙
            </div>
            
            {/* Coin Back (Tails) */}
            <div className="coin-back rounded-full border-4 border-yellow-400 bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-400 shadow-lg flex items-center justify-center text-3xl">
              🎯
            </div>
          </div>
        </div>

        {/* Animation Status Text */}
        <div className="mt-4 space-y-2">
          {animationPhase === 'confirming' && (
            <div className="space-y-2">
              <p className="text-purple-600 text-lg font-semibold animate-pulse">
                ⏳ Confirming transaction...
              </p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
          
          {animationPhase === 'flipping' && (
            <div className="space-y-2">
              <p className="text-blue-600 text-lg font-semibold animate-pulse">
                🌪️ Flipping the coin...
              </p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
          
          {animationPhase === 'settling' && (
            <p className="text-orange-600 text-lg font-medium">
              🎯 Landing...
            </p>
          )}
          
          {animationPhase === 'complete' && result && (
            <div className="space-y-3">
              <p className={`text-xl font-bold ${
                result === 'heads' ? 'text-orange-600' : 'text-blue-600'
              }`}>
                {result === 'heads' ? '🪙 HEADS!' : '🎯 TAILS!'}
              </p>
              
              {/* Win/Lose Result */}
              {userBet && (
                <div className="space-y-2">
                  {userBet === result ? (
                    <p className="text-2xl font-bold text-green-600 animate-pulse">
                      🎉 YOU WIN! 🎉
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-red-600">
                      😔 You Lose
                    </p>
                  )}
                  <p className="text-gray-600 text-sm">
                    You bet on {userBet} • Coin landed on {result}
                  </p>
                </div>
              )}
              
              {!userBet && (
                <p className="text-gray-600">
                  The coin landed on {result}!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Celebration Effects - Only for WINS */}
        {animationPhase === 'complete' && result && userBet === result && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 animate-ping">🎉</div>
            <div className="absolute top-1/3 right-1/4 animate-ping" style={{ animationDelay: '0.2s' }}>⭐</div>
            <div className="absolute bottom-1/3 left-1/3 animate-ping" style={{ animationDelay: '0.4s' }}>🎊</div>
            <div className="absolute bottom-1/4 right-1/3 animate-ping" style={{ animationDelay: '0.6s' }}>🎉</div>
          </div>
        )}

        {/* Sad effects for LOSSES */}
        {animationPhase === 'complete' && result && userBet && userBet !== result && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse opacity-50">
              💔
            </div>
          </div>
        )}
      </div>
    </div>
  )
}