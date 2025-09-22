'use client'

import { useState, useEffect } from 'react'

interface ResearchLoadingScreenProps {
  progress: string
  isVisible: boolean
}

const waterQualityFacts = [
  "💧 The average American drinks about 8 glasses of water per day",
  "🔬 Chlorine is added to water to kill harmful bacteria and viruses",
  "📊 The EPA allows up to 4.0 PPM of chlorine in drinking water",
  "🌊 Most municipal water systems use chlorine as a disinfectant",
  "📈 Chlorine levels can vary throughout the day and year",
  "🔍 Consumer Confidence Reports (CCRs) contain detailed water quality data",
  "💡 Water treatment plants test chlorine levels multiple times daily",
  "🌱 Some people are more sensitive to chlorine taste and smell",
  "📋 CCRs are published annually by all public water systems",
  "⚖️ Chlorine levels are regulated by the Safe Drinking Water Act"
]

export default function ResearchLoadingScreen({ progress, isVisible }: ResearchLoadingScreenProps) {
  const [currentFact, setCurrentFact] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!isVisible) return

    // Rotate facts every 3 seconds
    const factInterval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % waterQualityFacts.length)
    }, 3000)

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)

    return () => {
      clearInterval(factInterval)
      clearInterval(dotsInterval)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <div className="text-center">
          {/* Animated water drop */}
          <div className="mb-6">
            <div className="text-6xl animate-bounce">💧</div>
          </div>
          
          {/* Progress message */}
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {progress}
          </h3>
          
          {/* Loading animation */}
          <div className="mb-6">
            <div className="flex justify-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
          
          {/* Water quality fact */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 font-medium">
              {waterQualityFacts[currentFact]}
            </p>
          </div>
          
          {/* Progress indicator */}
          <div className="text-xs text-gray-500">
            Researching chlorine data{dots}
          </div>
        </div>
      </div>
    </div>
  )
}
