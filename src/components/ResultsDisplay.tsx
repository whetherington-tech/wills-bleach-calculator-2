'use client'

import { CalculationResult } from '@/types/database'
import { getShowerImpactDescription } from '@/utils/showerChlorineCalculations'

interface ResultsDisplayProps {
  result: CalculationResult
  onNewCalculation: () => void
}

export default function ResultsDisplay({ result, onNewCalculation }: ResultsDisplayProps) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="wf-h2 wf-text-gradient mb-4 text-center">
          YOUR CHLORINE EXPOSURE RESULTS
        </h2>
        <p className="wf-body text-center max-w-2xl mx-auto">
          You might be shocked by how much chlorine you're actually consuming every year from your tap water
        </p>
      </div>

      {/* Utility Information Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
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
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
        <h3 className="wf-h3 mb-6 flex items-center gap-3">
          <span className="text-xl">🧪</span>
          YOUR CHLORINE EXPOSURE ANALYSIS
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simplified Level Display */}
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {result.chlorinePPM.toFixed(2)}
            </div>
            <div className="text-gray-600 font-medium mb-4">Chlorine Level in Your Water</div>

            {/* EPA Safety Context - More Prominent */}
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {((result.chlorinePPM / 4.0) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-green-800 font-medium">of EPA Safety Limit</div>
              <div className="text-xs text-green-600 mt-1">
                (EPA Maximum: 4.0)
              </div>
            </div>

            <div className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800">
              ✅ Legal and Safe
            </div>
          </div>

          {/* Simple Comparison */}
          <div className="space-y-4">
            {/* Pool Comparison - Keep This! */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">To Put This in Perspective</h4>
              <p className="text-sm text-blue-700 mb-1">
                <strong>Swimming Pools:</strong> 1-3 chlorine level
              </p>
              <p className="text-sm text-blue-700">
                <strong>Your Drinking Water:</strong> {result.chlorinePPM.toFixed(2)} chlorine level
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Your tap water has similar chlorine levels to a swimming pool!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Context & Solutions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h4 className="wf-h4 mb-4">WHY CHLORINE? THE BALANCED PERSPECTIVE</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">Historical Context</h5>
            <p className="text-sm text-gray-600 mb-3">
              Since 1905, chlorine has been a vital public health tool, preventing cholera,
              typhoid, and other waterborne diseases that once killed thousands annually.
            </p>
            <p className="text-sm text-gray-600">
              Your utility follows this proven disinfection method to protect public health
              and meets all EPA requirements for safe water delivery.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">Modern Solutions</h5>
            <p className="text-sm text-gray-600 mb-3">
              While chlorine serves an important purpose, today's families have affordable
              options to reduce exposure at home.
            </p>
            <p className="text-xs text-gray-500 italic">
              💡 Advanced filtration systems can remove up to 99% of chlorine while preserving beneficial minerals - we may offer solutions in the future.
            </p>
          </div>
        </div>
      </div>

      {/* Consumption Analysis - Drinking Water */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
        <h3 className="wf-h3 mb-4 flex items-center gap-3">
          <span className="text-xl">🥤</span>
          YOUR DAILY DRINKING WATER CHLORINE EXPOSURE
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center bg-green-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {result.glassesPerDay}
            </div>
            <div className="wf-body font-semibold text-green-800">Glasses per Day</div>
            <div className="text-xs text-green-600 mt-1">
              ({(result.glassesPerDay * 16 * 0.0295735).toFixed(1)}L of tap water)
            </div>
          </div>
          <div className="text-center bg-orange-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {((result.chlorinePerGlass * result.glassesPerDay) / 318 * 48).toFixed(1)}
            </div>
            <div className="wf-body font-semibold text-orange-800">Teaspoons of Bleach</div>
            <div className="text-xs text-orange-600 mt-1">Per day from drinking</div>
          </div>
          <div className="text-center bg-red-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {((result.chlorinePerGlass * result.glassesPerDay) / 318 * 48 * 365 / 48).toFixed(1)}
            </div>
            <div className="wf-body font-semibold text-red-800">Cups of Bleach</div>
            <div className="text-xs text-red-600 mt-1">Per year from drinking</div>
          </div>
        </div>
      </div>

      {/* Shower Chlorine Analysis */}
      {result.showerChlorineData && result.showerMinutes && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <h3 className="wf-h3 mb-4 flex items-center gap-3">
            <span className="text-xl">🚿</span>
            YOUR SHOWER CHLORINE ABSORPTION
          </h3>

          <div className="mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
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
                      ${impact.color === 'orange' ? 'bg-orange-100 text-orange-800' : ''}
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
            <div className="text-center bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {result.showerChlorineData.totalShowerWaterLiters.toFixed(1)}L
              </div>
              <div className="wf-body font-semibold text-purple-800">Water per Shower</div>
              <div className="text-xs text-purple-600 mt-1">
                {(result.showerChlorineData.totalShowerWaterLiters * 0.264172).toFixed(1)} gallons
              </div>
            </div>
            <div className="text-center bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {result.showerChlorineData.totalChlorineAbsorbed.toFixed(2)}
              </div>
              <div className="wf-body font-semibold text-orange-800">mg Absorbed Daily</div>
              <div className="text-xs text-orange-600 mt-1">Skin + inhalation</div>
            </div>
            <div className="text-center bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {result.showerChlorineData.dailyBleachEquivalent.toFixed(3)}
              </div>
              <div className="wf-body font-semibold text-red-800">Teaspoons Bleach</div>
              <div className="text-xs text-red-600 mt-1">Daily equivalent</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Absorption Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Skin Absorption: </span>
                <span className="text-blue-800">{result.showerChlorineData.chlorineAbsorbedSkin.toFixed(2)} mg (29%)</span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Inhalation: </span>
                <span className="text-blue-800">{result.showerChlorineData.chlorineInhaled.toFixed(2)} mg (39%)</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              Based on peer-reviewed research published in the Journal of Exposure Analysis and Environmental Epidemiology (2005) showing 56% of chlorine volatilizes during showers with 70% inhalation absorption, and EPA studies confirming 29% dermal absorption rates.
            </div>
          </div>
        </div>
      )}

      {/* Total Daily Exposure - Combined */}
      {result.totalDailyChlorineExposure && result.totalDailyBleachEquivalent && result.showerChlorineData && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border-2 border-red-200">
          <h3 className="wf-h3 mb-6 text-center flex items-center justify-center gap-3">
            <span className="text-xl">⚡</span>
            YOUR TOTAL DAILY CHLORINE EXPOSURE
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-center bg-white p-6 rounded-lg shadow">
              <div className="text-4xl font-bold text-red-600 mb-2">
                {result.totalDailyChlorineExposure.toFixed(2)} mg
              </div>
              <div className="text-lg font-semibold text-red-800 mb-2">Total Daily Chlorine</div>
              <div className="text-sm text-gray-600">
                Drinking + Shower Combined
              </div>
            </div>
            <div className="text-center bg-white p-6 rounded-lg shadow">
              <div className="text-4xl font-bold text-red-600 mb-2">
                {result.totalDailyBleachEquivalent.toFixed(3)}
              </div>
              <div className="text-lg font-semibold text-red-800 mb-2">Teaspoons Bleach</div>
              <div className="text-sm text-gray-600">
                Daily Equivalent
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-3 text-center">Exposure Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {((result.chlorinePerGlass * result.glassesPerDay / result.totalDailyChlorineExposure) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-green-800 font-medium">From Drinking Water</div>
                <div className="text-xs text-green-600">
                  {(result.chlorinePerGlass * result.glassesPerDay).toFixed(2)} mg/day
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">
                  {((result.showerChlorineData.totalChlorineAbsorbed / result.totalDailyChlorineExposure) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-purple-800 font-medium">From Showering</div>
                <div className="text-xs text-purple-600">
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
          ${bleachComparison.color === 'green' ? 'bg-green-50 border-green-300' : ''}
          ${bleachComparison.color === 'yellow' ? 'bg-yellow-50 border-yellow-300' : ''}
          ${bleachComparison.color === 'orange' ? 'bg-orange-50 border-orange-300' : ''}
          ${bleachComparison.color === 'red' ? 'bg-red-50 border-red-300' : ''}
        `}>
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🚨</span>
          </div>
          <h3 className="wf-h3 mb-4 text-center">
            YOU'RE DRINKING THE EQUIVALENT OF
          </h3>
          <div className="text-6xl font-bold text-red-600 mb-4">
            {result.bleachEquivalent.toFixed(2)} CUPS
          </div>
          <h4 className="wf-h4 mb-6">
            OF HOUSEHOLD BLEACH EVERY YEAR!
          </h4>
          <div className="bg-white bg-opacity-75 rounded-lg p-6 mb-4">
            <p className="wf-body font-semibold mb-3 text-center">
              That's the same as consuming:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{Math.round(result.bleachEquivalent * 16)}</div>
                <div className="text-sm text-red-800">Tablespoons of bleach</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{Math.round(result.bleachEquivalent * 48)}</div>
                <div className="text-sm text-red-800">Teaspoons of bleach</div>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="wf-body text-center font-medium text-blue-800 mb-4">
              <strong>The good news?</strong> You don't have to keep drinking chlorinated water.
              There are simple solutions to dramatically reduce your chlorine exposure.
            </p>
            {/* Future CTA Button Location: "Book a Free Water Consultation" */}
            <div className="text-center">
              <div className="inline-block px-6 py-2 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 text-sm">
                Future CTA: Book Free Water Consultation
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Show total exposure results when shower data is available
        <div className="rounded-xl p-6 border-2 border-red-300 bg-red-50 text-center">
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🚨</span>
          </div>
          <h3 className="wf-h3 mb-4 text-center">
            YOUR YEARLY CHLORINE ABSORBED
          </h3>
          <div className="text-5xl font-bold text-red-600 mb-2">
            {((result.totalDailyBleachEquivalent * 365) / 16).toFixed(1)} GALLONS
          </div>
          <h4 className="wf-h4 mb-6">
            PER YEAR!
          </h4>
          <div className="bg-white bg-opacity-75 rounded-lg p-6 mb-4">
            <p className="wf-body font-semibold mb-4 text-center">
              This comes from BOTH drinking water AND shower absorption:
            </p>

          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="wf-body text-center font-medium text-blue-800 mb-4">
              <strong>Shocking, right?</strong> Most people don't realize that showering can expose you to more chlorine than drinking water.
              The good news? There are simple solutions to dramatically reduce your total chlorine exposure.
            </p>
            {/* Future CTA Button Location: "Book a Free Water Consultation" */}
            <div className="text-center">
              <div className="inline-block px-6 py-2 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 text-sm">
                Future CTA: Book Free Water Consultation
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <button
          onClick={onNewCalculation}
          className="flex-1 wf-button-primary py-4 px-6 flex items-center justify-center gap-2"
        >
          <span className="text-lg">🔄</span>
          CHECK ANOTHER AREA
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 wf-button-primary py-4 px-6 flex items-center justify-center gap-2"
        >
          <span className="text-lg">🖨️</span>
          PRINT RESULTS
        </button>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium mb-2 flex items-center gap-2">
          <span className="text-base">⚠️</span>
          Important Disclaimer:
        </p>
        <p>
          This calculator is for educational purposes only. Chlorine levels may vary throughout the day and year.
          For the most current water quality information, consult your utility&apos;s latest Consumer Confidence Report (CCR)
          or contact your water provider directly.
        </p>
      </div>
    </div>
  )
}