'use client'

import { useState, useEffect } from 'react'
import { CalculationResult } from '@/types/database'
import { getShowerImpactDescription } from '@/utils/showerChlorineCalculations'

interface ResultsDisplayProps {
  result: CalculationResult
  onNewCalculation: () => void
}

export default function ResultsDisplay({ result, onNewCalculation }: ResultsDisplayProps) {

  // Dynamic iClosed script loading
  useEffect(() => {
    console.log('🔧 Loading iClosed widget dynamically...')

    // Remove existing script if present
    const existingScript = document.querySelector('script[src*="iclosed.io"]')
    if (existingScript) {
      console.log('🗑️ Removing existing script')
      existingScript.remove()
    }

    // Create and inject script dynamically
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://app.iclosed.io/assets/widget.js'
    script.async = true

    // Track loading states
    script.onload = () => {
      console.log('✅ iClosed script loaded successfully')

      // Check for widget availability after load
      setTimeout(() => {
        console.log('🔍 Post-load check - window.iClosed:', typeof window.iClosed)

        // Try different initialization approaches
        if (typeof window.iClosed === 'object' && window.iClosed) {
          console.log('✅ iClosed widget object found')

          // Check available methods
          console.log('🔍 Available methods:', Object.keys(window.iClosed))

          // Try common initialization methods
          if (typeof window.iClosed.init === 'function') {
            console.log('🚀 Calling iClosed.init()')
            window.iClosed.init()
          } else if (typeof window.iClosed.initialize === 'function') {
            console.log('🚀 Calling iClosed.initialize()')
            window.iClosed.initialize()
          } else if (typeof window.iClosed.start === 'function') {
            console.log('🚀 Calling iClosed.start()')
            window.iClosed.start()
          }
        } else if (typeof window.iClosed === 'function') {
          console.log('🚀 Calling iClosed as function')
          window.iClosed()
        } else {
          console.log('❌ No iClosed widget found after script load')
        }
      }, 100)
    }

    script.onerror = (error) => {
      console.error('❌ Failed to load iClosed script:', error)
    }

    // Inject script into head
    document.head.appendChild(script)
    console.log('📋 Script injected into DOM')

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector('script[src*="iclosed.io"]')
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [])
  const formatChlorineData = () => {
    if (!result.chlorineData) return null

    const data = result.chlorineData
    return {
      hasRange: data.minChlorine && data.maxChlorine,
      range: data.minChlorine && data.maxChlorine
        ? `${data.minChlorine.toFixed(2)} - ${data.maxChlorine.toFixed(2)} PPM`
        : null,
      sampleCount: data.sampleCount || 'Unknown',
      dataSource: data.dataSource || 'Water Quality Database',
      isVerified: data.fromDatabase && !data.manuallyEntered
    }
  }

  const chlorineInfo = formatChlorineData()

  const getChlorineExposureLevel = (ppm: number) => {
    if (ppm <= 1.0) return {
      level: 'Minimal Exposure',
      color: 'green',
      description: 'Lower than typical municipal range',
      actionNote: 'Even at these levels, many families choose filtration for peace of mind'
    }
    if (ppm <= 2.0) return {
      level: 'Typical Municipal Range',
      color: 'blue',
      description: 'Standard chlorination for most US utilities',
      actionNote: 'This is the most common range - filtration can further reduce exposure'
    }
    if (ppm <= 3.0) return {
      level: 'Higher Municipal Range',
      color: 'orange',
      description: 'Above average but within legal limits',
      actionNote: 'Many families notice taste/odor at this level and choose filtration'
    }
    return {
      level: 'Maximum Legal Range',
      color: 'red',
      description: 'Approaching EPA maximum allowable limit',
      actionNote: 'While legally compliant, this level often motivates families to invest in filtration'
    }
  }

  const calculateRangeConsumption = () => {
    if (!chlorineInfo?.hasRange) return null

    const data = result.chlorineData
    const glassesPerDay = result.glassesPerDay
    const glassVolumeOz = 16
    const ozToMl = 29.5735
    const mgToOz = 0.000035274

    // Calculate range of chlorine consumption
    const minChlorinePerGlass = (data.minChlorine * glassVolumeOz * ozToMl) / 1000  // mg per glass
    const maxChlorinePerGlass = (data.maxChlorine * glassVolumeOz * ozToMl) / 1000  // mg per glass

    const minYearlyChlorine = minChlorinePerGlass * glassesPerDay * 365  // mg per year
    const maxYearlyChlorine = maxChlorinePerGlass * glassesPerDay * 365  // mg per year

    // Convert to bleach equivalent (assuming 1 cup = 236.588ml, household bleach = ~52,500mg/L chlorine)
    const bleachMgPerCup = 52500 * 0.236588
    const minBleachEquivalent = minYearlyChlorine / bleachMgPerCup
    const maxBleachEquivalent = maxYearlyChlorine / bleachMgPerCup

    return {
      minBleachCups: minBleachEquivalent,
      maxBleachCups: maxBleachEquivalent,
      minChlorineMg: minYearlyChlorine,
      maxChlorineMg: maxYearlyChlorine
    }
  }

  const exposureLevel = getChlorineExposureLevel(result.chlorinePPM)
  const rangeConsumption = calculateRangeConsumption()

  const getBleachComparison = (cups: number) => {
    if (cups < 0.5) return { level: 'low', message: 'Relatively low chlorine intake', color: 'green' }
    if (cups < 1) return { level: 'moderate', message: 'Moderate chlorine intake', color: 'yellow' }
    if (cups < 2) return { level: 'high', message: 'High chlorine intake', color: 'orange' }
    return { level: 'very-high', message: 'Very high chlorine intake', color: 'red' }
  }

  const bleachComparison = getBleachComparison(result.bleachEquivalent)

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="wf-h2 wf-text-gradient-animated mb-4 text-center">
          YOUR CHLORINE EXPOSURE RESULTS
        </h2>
        <p className="wf-body text-center max-w-2xl mx-auto">
          Discover exactly how much chlorine you're consuming and learn about proven solutions to protect your family
        </p>
      </div>

      {/* Utility Information Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
        <h3 className="wf-h3 mb-4">
          WATER UTILITY INFORMATION
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600 font-medium">Utility Name:</span>
            <p className="text-gray-900 font-semibold">
              {'utility_name' in result.utility ? result.utility.utility_name : result.utility.pws_name}
            </p>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Location:</span>
            <p className="text-gray-900 font-semibold">
              {'city' in result.utility ? result.utility.city : result.utility.city_name}, {' '}
              {'state' in result.utility ? result.utility.state : result.utility.state_code}
            </p>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Population Served:</span>
            <p className="text-gray-900 font-semibold">
              {'population_served' in result.utility
                ? result.utility.population_served.toLocaleString()
                : result.utility.population_served_count}
            </p>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Your Zip Code:</span>
            <p className="text-gray-900 font-semibold">{result.zipCode}</p>
          </div>
        </div>
      </div>

      {/* Simplified Chlorine Analysis Section */}
      <div className="bg-gradient-to-br from-green-50 via-white to-green-50 rounded-lg shadow-lg p-6 border-l-4 border-green-500">
        <h3 className="wf-h3 mb-6 flex items-center gap-3">
          <span className="text-xl">🧪</span>
          YOUR CHLORINE EXPOSURE ANALYSIS
        </h3>

        <div className="space-y-6">
          {/* Chlorine Level Display */}
          <div className="text-center">
            <div className="text-4xl wf-number wf-number-glow wf-data-indicator wf-text-gradient-animated mb-2">
              {result.chlorinePPM.toFixed(2)} PPM
            </div>
            <div className="text-gray-600 font-medium">Chlorine Level in Your Water</div>
          </div>

          {/* EPA and Perspective Side by Side */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* EPA Safety Context */}
            <div className="wf-metric-box wf-interactive p-4 rounded-lg">
              <div className="text-2xl wf-number wf-number-glow wf-text-gradient-success mb-1">
                {((result.chlorinePPM / 4.0) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-green-800 font-medium">of EPA Safety Limit</div>
              <div className="text-xs text-green-600 mt-1">
                (EPA Maximum: 4.0 PPM)
              </div>
              <div className="mt-3">
                <div className="inline-block px-3 py-1 rounded-lg text-sm font-medium bg-green-100 text-green-800">
                  ✅ Legal and Safe
                </div>
              </div>
            </div>

            {/* Perspective Comparison */}
            <div className="wf-metric-box wf-interactive p-4 rounded-lg">
              <h4 className="wf-h4 mb-2">To Put This in Perspective</h4>
              <p className="text-sm text-gray-700 mb-1">
                <strong>Swimming Pools:</strong> 1-3 PPM
              </p>
              <p className="text-sm text-gray-700">
                <strong>Your Drinking Water:</strong> {result.chlorinePPM.toFixed(2)} PPM
              </p>
              <p className="text-xs text-blue-800 mt-2">
                Your tap water has similar chlorine levels to a swimming pool!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Context & Solutions */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 rounded-lg shadow-lg p-6 border-l-4 border-slate-500">
        <h3 className="wf-h3 mb-6">WHY CHLORINE? THE BALANCED PERSPECTIVE</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="wf-h4 mb-3">Historical Context</h4>
            <p className="wf-body mb-3">
              Since 1905, chlorine has been a vital public health tool, preventing cholera,
              typhoid, and other waterborne diseases that once killed thousands annually.
            </p>
            <p className="wf-body">
              Your utility follows this proven disinfection method to protect public health
              and meets all EPA requirements for safe water delivery.
            </p>
          </div>
          <div>
            <h4 className="wf-h4 mb-3">Modern Solutions</h4>
            <p className="wf-body mb-4">
              While chlorine serves an important purpose, today's families have affordable
              options to reduce exposure at home.
            </p>

            <p className="wf-body">
              <strong>Advanced filtration systems</strong> can remove up to 99% of chlorine
              while preserving beneficial minerals.
            </p>
          </div>
        </div>
      </div>

      {/* Consumption Analysis - Drinking Water */}
      <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 rounded-lg shadow-lg p-6 border-l-4 border-red-500">
        <h3 className="wf-h3 mb-4 flex items-center gap-3">
          <span className="text-xl">🥤</span>
          YOUR DAILY DRINKING WATER CHLORINE EXPOSURE
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center wf-metric-box wf-interactive p-4 rounded-lg">
            <div className="text-2xl wf-number wf-number-glow text-green-600 mb-2">
              {result.glassesPerDay}
            </div>
            <div className="wf-body font-semibold text-green-800">Glasses per Day</div>
            <div className="text-xs text-green-600 mt-1">
              ({(result.glassesPerDay * 16 * 0.0295735).toFixed(1)}L of tap water)
            </div>
          </div>
          <div className="text-center wf-metric-box wf-interactive p-4 rounded-lg">
            <div className="text-2xl wf-number wf-number-glow wf-text-gradient-warning mb-2">
              {((result.chlorinePerGlass * result.glassesPerDay) / 318).toFixed(3)}
            </div>
            <div className="wf-body font-semibold text-red-800">Teaspoons of Bleach</div>
            <div className="text-xs text-red-600 mt-1">Per day from drinking</div>
          </div>
          <div className="text-center wf-metric-box wf-interactive p-4 rounded-lg">
            <div className="text-2xl wf-number wf-number-glow wf-text-gradient-warning mb-2">
              {(((result.chlorinePerGlass * result.glassesPerDay) / 318 * 365) / 48).toFixed(2)}
            </div>
            <div className="wf-body font-semibold text-red-800">Cups of Bleach</div>
            <div className="text-xs text-red-600 mt-1">Per year from drinking</div>
          </div>
        </div>
      </div>

      {/* Shower Chlorine Analysis */}
      {result.showerChlorineData && result.showerMinutes && (
        <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <h3 className="wf-h3 mb-4 flex items-center gap-3">
            <span className="text-xl">🚿</span>
            YOUR SHOWER CHLORINE ABSORPTION
          </h3>

          <div className="mb-6">
            <div className="text-center">
              <div className="text-2xl wf-number wf-number-glow wf-data-indicator text-blue-800 mb-2">
                {result.showerMinutes} Minute{result.showerMinutes !== 1 ? 's' : ''} Daily
              </div>
              <div className="text-gray-600 font-medium mb-4">
                {(() => {
                  const impact = getShowerImpactDescription(result.showerMinutes)
                  return (
                    <span className={`
                      inline-block px-3 py-1 rounded-lg text-sm font-medium
                      ${impact.color === 'green' ? 'bg-green-100 text-green-800' : ''}
                      ${impact.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
                      ${impact.color === 'orange' ? 'bg-orange-100 text-red-800' : ''}
                      ${impact.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {impact.level}
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center wf-metric-box wf-interactive p-4 rounded-lg">
              <div className="text-2xl wf-number wf-number-glow text-blue-800 mb-2">
                {result.showerChlorineData.totalShowerWaterLiters.toFixed(1)}L
              </div>
              <div className="wf-body font-semibold text-blue-800">Water per Shower</div>
              <div className="text-xs text-blue-800 mt-1">
                {(result.showerChlorineData.totalShowerWaterLiters * 0.264172).toFixed(1)} gallons
              </div>
            </div>
            <div className="text-center wf-metric-box wf-interactive p-4 rounded-lg">
              <div className="text-2xl wf-number wf-number-glow text-red-600 mb-2">
                {result.showerChlorineData.totalChlorineAbsorbed.toFixed(2)}
              </div>
              <div className="wf-body font-semibold text-red-800">mg Absorbed Daily</div>
              <div className="text-xs text-red-600 mt-1">Skin + inhalation</div>
            </div>
            <div className="text-center wf-metric-box wf-interactive p-4 rounded-lg">
              <div className="text-2xl wf-number wf-number-glow text-red-600 mb-2">
                {result.showerChlorineData.dailyBleachEquivalent.toFixed(3)}
              </div>
              <div className="wf-body font-semibold text-red-800">Teaspoons Bleach</div>
              <div className="text-xs text-red-600 mt-1">Daily equivalent</div>
            </div>
          </div>

          <div className="wf-metric-box wf-interactive p-4 rounded-lg">
            <h4 className="wf-h4 mb-3">Absorption Breakdown</h4>

            {/* Visual Comparison Bars - Relative to 100% Available Chlorine */}
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-orange-700">Skin Absorption</span>
                  <span className="text-sm font-bold text-orange-700">{result.showerChlorineData.chlorineAbsorbedSkin.toFixed(2)} mg</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full" style={{width: "29%"}}></div>
                </div>
                <div className="text-xs text-orange-600 mt-1">29% of total available chlorine</div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-red-800">Inhalation</span>
                  <span className="text-sm font-bold text-red-800">{result.showerChlorineData.chlorineInhaled.toFixed(2)} mg</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full" style={{width: "39.2%"}}></div>
                </div>
                <div className="text-xs text-red-600 mt-1">39.2% of total available chlorine (70% of 56% that turns to vapor)</div>
              </div>
            </div>

            {/* Key Insight */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
              <div className="flex items-start space-x-2">
                <span className="text-orange-600 mt-0.5">💡</span>
                <div>
                  <div className="text-sm font-medium text-orange-800">Key Insight:</div>
                  <div className="text-xs text-orange-700">
                    You absorb <strong>{(result.showerChlorineData.chlorineInhaled / result.showerChlorineData.chlorineAbsorbedSkin).toFixed(1)}x more chlorine</strong> through breathing than through your skin during showers.
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-blue-800">
              Based on peer-reviewed research published in the Journal of Exposure Analysis and Environmental Epidemiology (2005) showing 56% of chlorine turns to vapor during showers with 70% inhalation absorption, and EPA studies confirming 29% dermal absorption rates.
            </div>
          </div>
        </div>
      )}

      {/* Total Daily Exposure - Combined */}
      {result.totalDailyChlorineExposure && result.totalDailyBleachEquivalent && result.showerChlorineData && (
        <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <h3 className="wf-h3 mb-6 text-center flex items-center justify-center gap-3">
            <span className="text-xl">⚡</span>
            YOUR TOTAL DAILY CHLORINE EXPOSURE
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-center bg-white p-6 rounded-lg shadow">
              <div className="text-4xl wf-number wf-number-glow wf-text-gradient-warning mb-2">
                {result.totalDailyChlorineExposure.toFixed(2)} mg
              </div>
              <div className="text-lg font-semibold text-slate-800 mb-2">Total Daily Chlorine</div>
              <div className="text-sm text-gray-600">
                Drinking + Shower Combined
              </div>
            </div>
            <div className="text-center bg-white p-6 rounded-lg shadow">
              <div className="text-4xl wf-number wf-number-glow wf-text-gradient-warning mb-2">
                {result.totalDailyBleachEquivalent.toFixed(3)}
              </div>
              <div className="text-lg font-semibold text-slate-800 mb-2">Teaspoons Bleach</div>
              <div className="text-sm text-gray-600">
                Daily Equivalent
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <h4 className="wf-h4 mb-3 text-center">Exposure Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-3 wf-metric-box wf-interactive rounded-lg">
                <div className="text-xl wf-number wf-number-glow wf-text-gradient-warning">
                  {((result.chlorinePerGlass * result.glassesPerDay / result.totalDailyChlorineExposure) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-slate-800 font-medium">From Drinking Water</div>
                <div className="text-xs text-slate-600">
                  {(result.chlorinePerGlass * result.glassesPerDay).toFixed(2)} mg/day
                </div>
              </div>
              <div className="text-center p-3 wf-metric-box wf-interactive rounded-lg">
                <div className="text-xl wf-number wf-number-glow wf-text-gradient-warning">
                  {((result.showerChlorineData.totalChlorineAbsorbed / result.totalDailyChlorineExposure) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-slate-800 font-medium">From Showering</div>
                <div className="text-xs text-slate-600">
                  {result.showerChlorineData.totalChlorineAbsorbed.toFixed(2)} mg/day
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Bleach Equivalent - Main Result */}
      {!result.totalDailyBleachEquivalent ? (
        // Show drinking water only results if no shower data
        <div className={`
          rounded-xl p-6 border-2 text-center
          ${bleachComparison.color === 'green' ? 'bg-gradient-to-br from-green-50 via-white to-emerald-50 border-green-400' : ''}
          ${bleachComparison.color === 'yellow' ? 'bg-gradient-to-br from-yellow-50 via-white to-amber-50 border-yellow-400' : ''}
          ${bleachComparison.color === 'orange' ? 'bg-gradient-to-br from-orange-50 via-white to-red-50 border-orange-400' : ''}
          ${bleachComparison.color === 'red' ? 'bg-gradient-to-br from-red-50 via-white to-rose-50 border-red-400' : ''}
        `}>
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🚨</span>
          </div>
          <h3 className="wf-h3 mb-4 text-center">
            YOU'RE DRINKING THE EQUIVALENT OF
          </h3>
          <div className="text-6xl wf-number wf-number-glow wf-data-indicator wf-text-gradient-warning wf-text-pulse mb-4">
            {result.bleachEquivalent.toFixed(2)} CUPS
          </div>
          <h4 className="wf-h4 mb-6">
            OF HOUSEHOLD BLEACH EVERY YEAR!
          </h4>
          <div className="bg-white bg-opacity-75 rounded-lg p-6 mb-6">
            <p className="wf-body font-semibold mb-3 text-center">
              That's the same as consuming:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div className="wf-metric-box wf-interactive p-3 rounded-lg">
                <div className="text-2xl wf-number wf-number-glow text-red-600">{Math.round(result.bleachEquivalent * 16)}</div>
                <div className="text-sm text-red-800">Tablespoons of bleach</div>
              </div>
              <div className="wf-metric-box wf-interactive p-3 rounded-lg">
                <div className="text-2xl wf-number wf-number-glow text-red-600">{Math.round(result.bleachEquivalent * 48)}</div>
                <div className="text-sm text-red-800">Teaspoons of bleach</div>
              </div>
            </div>
          </div>

          {/* Enhanced Solution-Focused CTA Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl shadow-xl border border-blue-200 p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div>

            <div className="relative z-10 text-center">
              <div className="mb-6">
                <h3 className="wf-h3 wf-text-button-match mb-3">
                  YOUR FAMILY DESERVES BETTER WATER
                </h3>
                <p className="wf-text-button-match" style={{
                  fontFamily: 'TheMacksen, "Brush Script MT", cursive',
                  fontSize: '24px',
                  lineHeight: '30px',
                  fontStyle: 'italic',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  Water that loves your family back
                </p>
                <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mt-2"></div>
              </div>

              <div className="mb-6">
                <p className="text-lg leading-relaxed text-slate-700 mb-3">
                  <strong>The good news?</strong> You don't have to keep drinking chlorinated water.
                </p>
                <p className="text-base text-slate-600">
                  Advanced filtration can remove up to 99% of chlorine while preserving beneficial minerals.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-white/50 mb-6">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-800 text-sm">📞</span>
                  </div>
                  <h4 className="wf-h4">Quick 15-minute consultation:</h4>
                </div>
                <p className="text-slate-600">
                  Get transparent pricing, current availability, and see if professional filtration makes sense for your family.
                </p>
              </div>

              <button
                data-iclosed-link="https://app.iclosed.io/e/willsfriends/Your-15-Minute-Water-Consult"
                data-embed-type="popup"
                className="wf-button-primary text-lg px-10 py-5 min-w-[320px] cursor-pointer shadow-lg"
              >
                GET PRICING & TIMELINE
              </button>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                <div className="bg-white/60 p-3 rounded-lg border border-green-200/50 text-center">
                  <span className="text-green-600 text-xs">⏱️</span>
                  <p className="text-xs font-medium text-green-800 mt-1">Actually 15 minutes</p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg border border-green-200/50 text-center">
                  <span className="text-green-600 text-xs">💰</span>
                  <p className="text-xs font-medium text-green-800 mt-1">Real pricing upfront</p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg border border-green-200/50 text-center">
                  <span className="text-green-600 text-xs">🚀</span>
                  <p className="text-xs font-medium text-green-800 mt-1">Install within 2 weeks</p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg border border-green-200/50 text-center">
                  <span className="text-green-600 text-xs">🛡️</span>
                  <p className="text-xs font-medium text-green-800 mt-1">Zero obligation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Show total exposure results when shower data is available
        <div className="rounded-xl p-6 border-2 border-red-400 bg-gradient-to-br from-red-50 via-white to-rose-50 text-center">
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🚨</span>
          </div>
          <h3 className="wf-h3 mb-4 text-center">
            YOUR BODY ABSORBED THE EQUIVALENT OF
          </h3>
          <div className="text-4xl wf-number wf-number-glow wf-data-indicator wf-text-gradient-warning wf-text-pulse mb-2">
            {((result.totalDailyBleachEquivalent * 365) / 16).toFixed(1)} GALLONS
          </div>
          <h4 className="wf-h4 mb-4">
            OF BLEACH THIS YEAR!
          </h4>
          <div className="text-xs text-gray-600 mb-6 text-center">
            {(((result.chlorinePerGlass * result.glassesPerDay) / 318 * 365) / 16).toFixed(1)} gallons from drinking • {((result.showerChlorineData.dailyBleachEquivalent * 365) / 16).toFixed(1)} gallons from showering (skin + inhalation)
          </div>
          {/* Compact CTA Section */}
          <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl shadow-xl border border-slate-200 mt-6 p-6">
            <div className="text-center mb-6">
              <h3 className="wf-h3 wf-text-button-match mb-2">
                YOUR FAMILY DESERVES BETTER WATER
              </h3>
              <p className="wf-text-button-match" style={{
                fontFamily: 'TheMacksen, "Brush Script MT", cursive',
                fontSize: '22px',
                fontStyle: 'italic',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                Water that loves your family back
              </p>
            </div>

            <div className="text-center mb-4">
              <p className="text-base text-slate-700 mb-3">
                You're absorbing the equivalent of <span className="wf-number wf-number-glow wf-text-gradient-warning text-lg">{((result.totalDailyBleachEquivalent * 365) / 16).toFixed(1)} gallons</span> of bleach yearly.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-4">
              <h4 className="wf-h4 text-blue-900 mb-3 text-center">Imagine this transformation in just 2 weeks:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm max-w-2xl mx-auto">
                <div className="flex items-start justify-center space-x-2">
                  <span className="text-blue-600 mt-0.5">☕</span>
                  <span className="text-blue-800">Coffee that actually tastes incredible</span>
                </div>
                <div className="flex items-start justify-center space-x-2">
                  <span className="text-blue-600 mt-0.5">✨</span>
                  <span className="text-blue-800">Skin feels noticeably softer</span>
                </div>
                <div className="flex items-start justify-center space-x-2">
                  <span className="text-blue-600 mt-0.5">💇</span>
                  <span className="text-blue-800">Hair becomes manageable again</span>
                </div>
                <div className="flex items-start justify-center space-x-2">
                  <span className="text-blue-600 mt-0.5">💧</span>
                  <span className="text-blue-800">Kids actually want to drink water</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-white/50 mb-4 text-center">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-800 text-xs">📞</span>
                </div>
                <h4 className="wf-h4">Quick 15-minute call:</h4>
              </div>
              <p className="text-sm text-slate-600">
                Get transparent pricing, see current availability, and learn about your options.
                No commission hungry reps.<br/>
                Just straight answers from people who care about your water.
              </p>
            </div>

            <div className="text-center mb-4">
              <button
                data-iclosed-link="https://app.iclosed.io/e/willsfriends/Your-15-Minute-Water-Consult"
                data-embed-type="popup"
                className="wf-button-primary text-lg px-8 py-4 min-w-[280px] cursor-pointer shadow-2xl"
              >
                GET PRICING & TIMELINE
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-white/60 p-2 rounded-lg border border-green-200/50 text-center">
                <span className="text-green-600 text-xs">⏱️</span>
                <p className="text-xs font-medium text-green-800 mt-1">Actually 15 min</p>
              </div>
              <div className="bg-white/60 p-2 rounded-lg border border-green-200/50 text-center">
                <span className="text-green-600 text-xs">💰</span>
                <p className="text-xs font-medium text-green-800 mt-1">Real pricing</p>
              </div>
              <div className="bg-white/60 p-2 rounded-lg border border-green-200/50 text-center">
                <span className="text-green-600 text-xs">🚀</span>
                <p className="text-xs font-medium text-green-800 mt-1">Install in 2 weeks</p>
              </div>
              <div className="bg-white/60 p-2 rounded-lg border border-green-200/50 text-center">
                <span className="text-green-600 text-xs">🛡️</span>
                <p className="text-xs font-medium text-green-800 mt-1">Zero obligation</p>
              </div>
            </div>

            <div className="text-center mb-3">
              <div className="inline-flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <span className="text-green-600 mr-1 text-sm">✨</span>
                <p className="text-xs font-medium text-green-800">We'll tell you if it's NOT right for you</p>
              </div>
            </div>

            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <div className="flex items-start space-x-2">
                <span className="text-orange-600 text-sm mt-0.5">⚠️</span>
                <p className="text-xs text-orange-900">
                  <strong>Heads up:</strong> We build systems in small batches in Tennessee, and our install calendar fills up fast.
                  Reach out now before this month's window closes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Disclaimer */}
      <div className="wf-metric-box rounded-lg p-4 wf-body bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400">
        <p className="font-medium mb-2 flex items-center gap-2">
          <span className="text-base">⚠️</span>
          Important Disclaimer:
        </p>
        <p className="mb-3">
          This calculator is for educational purposes only. Every home is different and these numbers are estimates based on current scientific studies and your local water data. Your real chlorine intake may vary.
        </p>
        <p>
          Chlorine levels may vary throughout the day and year. For the most current water quality information, consult your utility&apos;s latest Consumer Confidence Report (CCR) or contact your water provider directly.
        </p>
      </div>

    </div>
  )
}