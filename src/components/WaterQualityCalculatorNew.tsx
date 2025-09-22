'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WaterUtility, WaterSystem, CalculationResult } from '@/types/database'
import ResearchLoadingScreen from './ResearchLoadingScreen'
import ManualChlorineEntry from './ManualChlorineEntry'

export default function WaterQualityCalculatorNew() {
  const [zipCode, setZipCode] = useState('')
  const [availableUtilities, setAvailableUtilities] = useState<(WaterUtility | WaterSystem)[]>([])
  const [selectedUtility, setSelectedUtility] = useState<WaterUtility | WaterSystem | null>(null)
  const [dailyGlasses, setDailyGlasses] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [utilityChlorineData, setUtilityChlorineData] = useState<any>(null)
  const [isResearching, setIsResearching] = useState(false)
  const [researchProgress, setResearchProgress] = useState('')
  const [currentStep, setCurrentStep] = useState<'zip' | 'utility' | 'glasses' | 'loading' | 'results'>('zip')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualEntryError, setManualEntryError] = useState<any>(null)

  const handleManualEntrySuccess = (data: any) => {
    console.log('🔧 Manual entry successful:', data)
    setShowManualEntry(false)
    setManualEntryError(null)
    
    // Update the chlorine data with the manually entered data
    const chlorineData = {
      averageChlorine: parseFloat(data.average_chlorine_ppm),
      minChlorine: data.min_chlorine_ppm ? parseFloat(data.min_chlorine_ppm) : null,
      maxChlorine: data.max_chlorine_ppm ? parseFloat(data.max_chlorine_ppm) : null,
      sampleCount: data.sample_count,
      lastUpdated: data.last_updated,
      dataSource: data.data_source,
      notes: data.notes,
      fromDatabase: true,
      manuallyEntered: true
    }
    
    setUtilityChlorineData(chlorineData)
    setResearchProgress('✅ Chlorine data entered manually!')
  }

  const handleManualEntryCancel = () => {
    setShowManualEntry(false)
    setManualEntryError(null)
    setResearchProgress('')
  }
  

  const fetchUtilitiesByZipCode = async (zip: string) => {
    setLoading(true)
    setError('')
    setAvailableUtilities([])
    setSelectedUtility(null)

    try {
      let utilities: (WaterUtility | WaterSystem)[] = []

      // Step 0: First try to find in zip_code_mapping table
      const { data: zipMappings, error: zipError } = await supabase
        .from('zip_code_mapping')
        .select('*')
        .eq('zip_code', zip)

      if (!zipError && zipMappings && zipMappings.length > 0) {
        // Get utilities from water_utilities table using PWSID from mapping
        const pwsids = zipMappings.map(mapping => mapping.pwsid)
        
        const { data: customUtilities, error: customError } = await supabase
          .from('water_utilities')
          .select('*')
          .in('pwsid', pwsids)
          .eq('is_active', true)

        if (!customError && customUtilities && customUtilities.length > 0) {
          utilities.push(...customUtilities)
        }
      }

      // Step 1: Try to find municipal systems in the exact zip code
      const { data: municipalSystems, error: municipalError } = await supabase
        .from('water_systems')
        .select('*')
        .eq('zip_code', zip)
        .gte('population_served_count', '1000')
        .in('pws_type_code', ['CWS'])
        .in('owner_type_code', ['L', 'M']) // Municipal ownership
        .eq('pws_activity_code', 'A') // Only active utilities
        .limit(3)

      if (!municipalError && municipalSystems && municipalSystems.length > 0) {
        utilities.push(...municipalSystems)
      } else {
        // Step 2: If no municipal systems in exact zip, find municipal systems in the same city
        const { data: cityInfo, error: cityError } = await supabase
          .from('water_systems')
          .select('city_name, state_code')
          .eq('zip_code', zip)
          .limit(1)

        if (!cityError && cityInfo && cityInfo.length > 0) {
          const cityName = cityInfo[0].city_name
          const stateCode = cityInfo[0].state_code
          
          const { data: cityMunicipal, error: cityMunicipalError } = await supabase
            .from('water_systems')
            .select('*')
            .ilike('city_name', cityName)
            .eq('state_code', stateCode)
            .gte('population_served_count', '1000')
            .in('pws_type_code', ['CWS'])
            .in('owner_type_code', ['L', 'M'])
            .eq('pws_activity_code', 'A') // Only active utilities
            .order('population_served_count', { ascending: false })
            .limit(5)

          if (!cityMunicipalError && cityMunicipal && cityMunicipal.length > 0) {
            utilities.push(...cityMunicipal)
          }
        }
        
        // Step 2.5: Special case for College Grove area - look for Nolensville utilities
        const hasActiveUtilities = utilities.some(u => u.pws_activity_code === 'A')
        if (!hasActiveUtilities && zip === '37046') {
          const { data: nolensvilleUtilities, error: nolensvilleError } = await supabase
            .from('water_systems')
            .select('*')
            .ilike('pws_name', '%NOLENSVILLE%')
            .eq('state_code', 'TN')
            .gte('population_served_count', '1000')
            .in('pws_type_code', ['CWS'])
            .in('owner_type_code', ['L', 'M'])
            .eq('pws_activity_code', 'A') // Only active utilities
            .order('population_served_count', { ascending: false })
            .limit(3)

          if (!nolensvilleError && nolensvilleUtilities && nolensvilleUtilities.length > 0) {
            utilities.push(...nolensvilleUtilities)
          }
        }
        
        // Step 3: Last resort - any systems in the exact zip code, but prioritize municipal
        if (utilities.length === 0) {
          const { data: anySystems, error: anyError } = await supabase
            .from('water_systems')
            .select('*')
            .eq('zip_code', zip)
            .gte('population_served_count', '100')
            .in('pws_type_code', ['CWS'])
            .eq('pws_activity_code', 'A') // Only active utilities
            .limit(5)

          if (!anyError && anySystems) {
            // Sort to prioritize municipal ownership
            anySystems.sort((a, b) => {
              const aIsMunicipal = ['L', 'M'].includes(a.owner_type_code)
              const bIsMunicipal = ['L', 'M'].includes(b.owner_type_code)
              
              if (aIsMunicipal && !bIsMunicipal) return -1
              if (!aIsMunicipal && bIsMunicipal) return 1
              
              return parseInt(b.population_served_count || '0') - parseInt(a.population_served_count || '0')
            })
            
            utilities.push(...anySystems)
          }
        }
      }

      // Remove duplicates and filter out inactive utilities
      const uniqueUtilities = utilities.filter((utility, index, self) => 
        index === self.findIndex(u => u.pwsid === utility.pwsid) &&
        utility.pws_activity_code === 'A' // Only active utilities
      )

      uniqueUtilities.sort((a, b) => {
        // Prioritize municipal systems
        const aIsMunicipal = 'owner_type_code' in a ? ['L', 'M'].includes(a.owner_type_code) : false
        const bIsMunicipal = 'owner_type_code' in b ? ['L', 'M'].includes(b.owner_type_code) : false
        
        if (aIsMunicipal && !bIsMunicipal) return -1
        if (!aIsMunicipal && bIsMunicipal) return 1
        
        // Then by population served
        const aPop = 'population_served' in a ? a.population_served : parseInt(a.population_served_count || '0')
        const bPop = 'population_served' in b ? b.population_served : parseInt(b.population_served_count || '0')
        return bPop - aPop
      })

      setAvailableUtilities(uniqueUtilities)
      if (uniqueUtilities.length > 0) {
        setSelectedUtility(uniqueUtilities[0])
        setCurrentStep('utility')
      } else {
        setError('No water utilities found for this zip code. Please try a different zip code.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Error fetching water utilities: ${errorMessage}`)
      console.error('Detailed error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchChlorineData = async (pwsid: string, utilityName?: string, city?: string, state?: string) => {
    try {
      // First, try to get chlorine data from the new chlorine_data table
      const { data: chlorineData, error: chlorineError } = await supabase
        .from('chlorine_data')
        .select('*')
        .eq('pwsid', pwsid)
        .maybeSingle()

      if (!chlorineError && chlorineData) {
        return {
          averageChlorine: parseFloat(chlorineData.average_chlorine_ppm),
          minChlorine: parseFloat(chlorineData.min_chlorine_ppm),
          maxChlorine: parseFloat(chlorineData.max_chlorine_ppm),
          sampleCount: chlorineData.sample_count,
          lastUpdated: chlorineData.last_updated,
          dataSource: chlorineData.data_source,
          notes: chlorineData.notes,
          fromDatabase: true
        }
      }

      // Fallback: Look for chlorine data in lcr_samples table (if available)
      const { data: chlorineSamples, error: lcrError } = await supabase
        .from('lcr_samples')
        .select('*')
        .eq('pwsid', pwsid)
        .in('contaminant_code', ['CL2', 'CHLORINE', 'FREE_CHLORINE', 'TOTAL_CHLORINE'])
        .order('sampling_end_date', { ascending: false })
        .limit(10)

      if (!lcrError && chlorineSamples && chlorineSamples.length > 0) {
        const validSamples = chlorineSamples.filter(sample => 
          sample.sample_measure && 
          !isNaN(parseFloat(sample.sample_measure)) &&
          parseFloat(sample.sample_measure) > 0
        )

        if (validSamples.length > 0) {
          const totalChlorine = validSamples.reduce((sum, sample) => 
            sum + parseFloat(sample.sample_measure), 0
          )
          const averageChlorine = totalChlorine / validSamples.length
          
          return {
            averageChlorine: averageChlorine,
            sampleCount: validSamples.length,
            latestSample: validSamples[0],
            allSamples: validSamples,
            fromDatabase: true
          }
        }
      }

      // If no data found, trigger automatic research
      if (utilityName && city && state) {
        console.log('🔧 No existing data found, starting research...')
        setIsResearching(true)
        setResearchProgress('🔍 Searching for chlorine data...')
        
        try {
          const researchUrl = `/api/research-and-store?action=research_single&pwsid=${pwsid}&utility=${encodeURIComponent(utilityName)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`
          console.log('🔧 Research URL:', researchUrl)
          
          const researchResponse = await fetch(researchUrl, {
            method: 'POST'
          })
          
          if (!researchResponse.ok) {
            const errorText = await researchResponse.text()
            console.error('Research API error response:', errorText)
            throw new Error(`Research API error: ${researchResponse.status} - ${errorText}`)
          }
          
          const researchResult = await researchResponse.json()
          console.log('🔧 Research API response:', researchResult)
          console.log('🔧 Research API response details:', JSON.stringify(researchResult, null, 2))
          
          if (researchResult.success && researchResult.data) {
            setResearchProgress('✅ Found chlorine data!')
            console.log('🔧 Research successful, data:', researchResult.data)
            const chlorineData = {
              averageChlorine: parseFloat(researchResult.data.average_chlorine_ppm),
              minChlorine: parseFloat(researchResult.data.min_chlorine_ppm),
              maxChlorine: parseFloat(researchResult.data.max_chlorine_ppm),
              sampleCount: researchResult.data.sample_count,
              lastUpdated: researchResult.data.last_updated,
              dataSource: researchResult.data.data_source,
              notes: researchResult.data.notes,
              fromDatabase: true,
              justResearched: true
            }
            console.log('🔧 Returning chlorine data:', chlorineData)
            return chlorineData
          } else {
            setResearchProgress('⚠️ No chlorine data found in CCR reports')
            console.log('🔧 No data found in research result:', researchResult)
            
            // Check if manual entry is available
            if (researchResult.manualEntryAvailable) {
              setManualEntryError({
                errorType: researchResult.errorType,
                userMessage: researchResult.userMessage,
                searchedUrls: researchResult.searchedUrls || [],
                manualEntryInstructions: researchResult.manualEntryInstructions || [],
                nextSteps: researchResult.nextSteps || []
              })
              setShowManualEntry(true)
            }
            
            return null // Return null to indicate no data found
          }
        } catch (researchError) {
          console.error('Research error:', researchError)
          setResearchProgress('⚠️ Research failed - no data available')
          
          // Check if it's a JSON parsing error
          if (researchError instanceof SyntaxError && researchError.message.includes('JSON')) {
            console.error('JSON parsing error - API response was not valid JSON')
          }
          
          return null // Return null to indicate no data found
        } finally {
          console.log('🔧 Research finally block - resetting states')
          setIsResearching(false)
          setResearchProgress('')
        }
      }

      return null
    } catch (err) {
      console.error('Error in fetchChlorineData:', err)
      return null
    }
  }

  const calculateChlorineConsumption = (utility: WaterUtility | WaterSystem, glasses: number, chlorineData: any) => {
    // Only calculate if we have real chlorine data
    if (!chlorineData || !chlorineData.averageChlorine) {
      throw new Error('No chlorine data available for this utility')
    }
    
    const chlorineLevel = chlorineData.averageChlorine;
    
    // CONSTANTS
    const ozToLiters = 0.0295735;
    const daysPerYear = 365;
    const bleachConcentration = 52500; // mg chlorine per liter of bleach
    const litersPerCup = 0.236588;
    
    // CALCULATION
    const dailyWaterLiters = glasses * 16 * ozToLiters;
    const dailyChlorineMg = dailyWaterLiters * chlorineLevel;
    const yearlyChlorineMg = dailyChlorineMg * daysPerYear;
    const bleachLiters = yearlyChlorineMg / bleachConcentration;
    const bleachCups = bleachLiters / litersPerCup;
    
    // Additional calculations for display
    const chlorinePerGlass = dailyChlorineMg / glasses; // mg per glass
    const chlorinePerYear = yearlyChlorineMg; // mg per year
    
    return {
      glassesPerDay: glasses,
      chlorinePerGlass: chlorinePerGlass,
      chlorinePerYear: chlorinePerYear,
      bleachEquivalent: bleachCups,
      utility: utility,
      zipCode: zipCode,
      chlorinePPM: chlorineLevel,
      chlorineData: chlorineData
    }
  }

  const handleUtilityChange = async (pwsid: string) => {
    const utility = availableUtilities.find(u => u.pwsid === pwsid)
    setSelectedUtility(utility || null)
    setResult(null)
    setUtilityChlorineData(null)
    // Don't automatically move to next step - let user click Continue
  }

  const handleContinue = async () => {
    if (selectedUtility && 'pwsid' in selectedUtility) {
      const pwsid = selectedUtility.pwsid
      const utilityName = selectedUtility.pws_name || selectedUtility.utility_name
      const city = selectedUtility.city_name || selectedUtility.city
      const state = selectedUtility.state_code || selectedUtility.state
      
      // Move to loading step
      setCurrentStep('loading')
      setIsResearching(true)
      setResearchProgress('🔍 Getting chlorine data...')
      
      try {
        console.log('🔧 Starting chlorine data lookup for:', { pwsid, utilityName, city, state })
        
        // First check if we have existing data
        const { data: existingData, error: checkError } = await supabase
          .from('chlorine_data')
          .select('*')
          .eq('pwsid', pwsid)
          .maybeSingle()

        let chlorineData = null

        if (!checkError && existingData) {
          console.log('🔧 Found existing data:', existingData)
          setResearchProgress('✅ Found chlorine data!')
          chlorineData = {
            averageChlorine: parseFloat(existingData.average_chlorine_ppm),
            minChlorine: parseFloat(existingData.min_chlorine_ppm),
            maxChlorine: parseFloat(existingData.max_chlorine_ppm),
            sampleCount: existingData.sample_count,
            lastUpdated: existingData.last_updated,
            dataSource: existingData.data_source,
            notes: existingData.notes,
            fromDatabase: true
          }
        } else {
          // No existing data, do research
          console.log('🔧 No existing data, starting research...')
          setResearchProgress('🔍 Researching chlorine data from CCR reports...')
          chlorineData = await fetchChlorineData(pwsid, utilityName, city, state)
        }
        
        console.log('🔧 Chlorine data lookup completed:', chlorineData)
        setUtilityChlorineData(chlorineData)
        
        // If we have chlorine data, move to glasses step
        if (chlorineData) {
          console.log('🔧 Moving to glasses step with chlorine data:', chlorineData)
          setCurrentStep('glasses')
        } else {
          console.log('🔧 No chlorine data found - research failed or no data available')
          setError('No chlorine data available for this utility. Please try a different utility.')
          setCurrentStep('utility')
        }
      } catch (error) {
        console.error('Error getting chlorine data:', error)
        setError('Failed to get chlorine data. Please try again or contact us for assistance.')
        setCurrentStep('utility')
      } finally {
        setIsResearching(false)
        setResearchProgress('')
      }
    }
  }

  const handleCalculateResults = async () => {
    if (selectedUtility && dailyGlasses > 0) {
      const pwsid = selectedUtility.pwsid
      const utilityName = selectedUtility.pws_name || selectedUtility.utility_name
      const city = selectedUtility.city_name || selectedUtility.city
      const state = selectedUtility.state_code || selectedUtility.state
      
      // Move to loading step
      setCurrentStep('loading')
      setIsResearching(true)
      setResearchProgress('🔍 Getting chlorine data...')
      
      try {
        console.log('🔧 Starting chlorine data lookup for calculation:', { pwsid, utilityName, city, state })
        
        // First check if we have existing data
        const { data: existingData, error: checkError } = await supabase
          .from('chlorine_data')
          .select('*')
          .eq('pwsid', pwsid)
          .maybeSingle()

        let chlorineData = null

        if (!checkError && existingData) {
          console.log('🔧 Found existing data for calculation:', existingData)
          setResearchProgress('✅ Found chlorine data!')
          chlorineData = {
            averageChlorine: parseFloat(existingData.average_chlorine_ppm),
            minChlorine: parseFloat(existingData.min_chlorine_ppm),
            maxChlorine: parseFloat(existingData.max_chlorine_ppm),
            sampleCount: existingData.sample_count,
            lastUpdated: existingData.last_updated,
            dataSource: existingData.data_source,
            notes: existingData.notes,
            fromDatabase: true
          }
        } else {
          // No existing data, do research
          console.log('🔧 No existing data, starting research for calculation...')
          setResearchProgress('🔍 Researching chlorine data from CCR reports...')
          chlorineData = await fetchChlorineData(pwsid, utilityName, city, state)
        }
        
        console.log('🔧 Chlorine data lookup completed for calculation:', chlorineData)
        setUtilityChlorineData(chlorineData)
        
        // Calculate results if we have chlorine data
        if (chlorineData) {
          console.log('🔧 Calculating results with:', { selectedUtility, dailyGlasses, chlorineData })
          try {
            const calculation = calculateChlorineConsumption(selectedUtility, dailyGlasses, chlorineData)
            console.log('🔧 Calculation result:', calculation)
            setResult(calculation)
            setError('')
            setCurrentStep('results')
            console.log('🔧 Moving to results step!')
          } catch (calcError) {
            console.error('Error calculating results:', calcError)
            setError('Failed to calculate results. Please try again.')
            setCurrentStep('glasses')
          }
        } else {
          console.log('🔧 No chlorine data found for calculation')
          setError('No chlorine data available for this utility. Please try a different utility.')
          setCurrentStep('glasses')
        }
      } catch (error) {
        console.error('Error getting chlorine data for calculation:', error)
        setError('Failed to get chlorine data. Please try again or contact us for assistance.')
        setCurrentStep('glasses')
      } finally {
        setIsResearching(false)
        setResearchProgress('')
      }
    }
  }

  const handleZipCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (zipCode.trim()) {
      fetchUtilitiesByZipCode(zipCode.trim())
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 lg:p-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8 sm:mb-12 text-center">
          💧 Water Quality Calculator
        </h1>
        
        <div className="space-y-8">
          {/* Step 1: Zip Code Input */}
          {currentStep === 'zip' && (
            <div className="bg-gray-50 rounded-lg p-6">
            <label htmlFor="zipCode" className="block text-lg font-semibold text-gray-800 mb-3">
              📍 Enter Your Zip Code
            </label>
            <form onSubmit={handleZipCodeSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                id="zipCode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="e.g., 37067"
                className="flex-1 px-4 py-3 text-lg text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={5}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '🔍 Searching...' : '🔍 Find Utilities'}
              </button>
            </form>
            </div>
          )}

          {/* Step 2: Utility Selection */}
          {currentStep === 'utility' && availableUtilities.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6">
              <label htmlFor="utility" className="block text-lg font-semibold text-gray-800 mb-3">
                🏢 Select Your Water Utility
              </label>
              <select
                id="utility"
                value={selectedUtility?.pwsid || ''}
                onChange={(e) => handleUtilityChange(e.target.value)}
                className="w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableUtilities.map((utility) => (
                  <option key={utility.pwsid} value={utility.pwsid}>
                    {('utility_name' in utility ? utility.utility_name : utility.pws_name)} 
                    {' - '}
                    {('city' in utility ? utility.city : utility.city_name)}, 
                    {('state' in utility ? utility.state : utility.state_code)}
                    {' - '}
                    {('population_served' in utility ? utility.population_served : utility.population_served_count)} served
                    {' - '}
                    {('owner_type_code' in utility && ['L', 'M'].includes(utility.owner_type_code)) ? 'Municipal' : 'Private'}
                  </option>
                ))}
              </select>
              <div className="mt-4">
                <button
                  onClick={() => setCurrentStep('glasses')}
                  disabled={!selectedUtility}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Daily Glasses Input */}
          {currentStep === 'glasses' && selectedUtility && (
            <div className="bg-gray-50 rounded-lg p-6">
              <label htmlFor="glasses" className="block text-lg font-semibold text-gray-800 mb-3">
                🥤 How many 16oz glasses of water do you drink per day?
              </label>
              <input
                type="number"
                id="glasses"
                value={dailyGlasses}
                onChange={(e) => setDailyGlasses(parseInt(e.target.value) || 0)}
                min="1"
                max="50"
                className="w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="mt-4">
                <button
                  onClick={handleCalculateResults}
                  disabled={dailyGlasses <= 0}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  Calculate My Chlorine Intake
                </button>
              </div>
            </div>
          )}


          {/* Step 4: Results Display */}
          {currentStep === 'results' && result && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-6 text-center">
                📊 Your Results
              </h2>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between bg-white rounded-lg p-4 shadow-sm">
                  <span className="font-semibold text-lg text-gray-700">Water Utility:</span>
                  <span className="text-lg text-gray-900 font-medium">{'utility_name' in result.utility ? result.utility.utility_name : result.utility.pws_name}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between bg-white rounded-lg p-4 shadow-sm">
                  <span className="font-semibold text-lg text-gray-700">Location:</span>
                  <span className="text-lg text-gray-900 font-medium">{'city' in result.utility ? result.utility.city : result.utility.city_name}, {'state' in result.utility ? result.utility.state : result.utility.state_code}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between bg-white rounded-lg p-4 shadow-sm">
                  <span className="font-semibold text-lg text-gray-700">Population Served:</span>
                  <span className="text-lg text-gray-900 font-medium">{'population_served' in result.utility ? result.utility.population_served.toLocaleString() : result.utility.population_served_count}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between bg-white rounded-lg p-4 shadow-sm">
                  <span className="font-semibold text-lg text-gray-700">Daily Glasses (16oz):</span>
                  <span className="text-lg text-gray-900 font-medium">{result.glassesPerDay}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between bg-white rounded-lg p-4 shadow-sm">
                  <span className="font-semibold text-lg text-gray-700">Chlorine Level:</span>
                  <div className="text-right">
                    <span className="text-lg text-gray-900 font-medium">{result.chlorinePPM.toFixed(2)} PPM</span>
                    {result.chlorineData ? (
                      <p className="text-sm text-green-600">✓ From actual water quality data</p>
                    ) : (
                      <p className="text-sm text-yellow-600">⚠ Estimated (no data found)</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between bg-white rounded-lg p-4 shadow-sm">
                  <span className="font-semibold text-lg text-gray-700">Chlorine per Glass:</span>
                  <span className="text-lg text-gray-900 font-medium">{result.chlorinePerGlass.toFixed(3)} mg</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between bg-white rounded-lg p-4 shadow-sm">
                  <span className="font-semibold text-lg text-gray-700">Annual Chlorine Intake:</span>
                  <span className="text-lg text-gray-900 font-medium">{result.chlorinePerYear.toFixed(1)} mg</span>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-xl p-6 mt-6">
                  <p className="text-yellow-900 font-bold text-xl sm:text-2xl text-center mb-3">
                    🧪 You drink the equivalent of <span className="text-red-600">{result.bleachEquivalent.toFixed(2)} cups</span> of household bleach per year!
                  </p>
                  <p className="text-yellow-800 text-lg text-center">
                    That's about <span className="font-bold">{Math.round(result.bleachEquivalent * 16)} tablespoons</span> or <span className="font-bold">{Math.round(result.bleachEquivalent * 48)} teaspoons</span> of bleach annually.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <p className="text-red-800 text-lg font-medium">⚠️ {error}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Research Loading Screen */}
      <ResearchLoadingScreen 
        progress={researchProgress} 
        isVisible={isResearching} 
      />

      {/* Manual Chlorine Entry Modal */}
      {showManualEntry && selectedUtility && manualEntryError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ManualChlorineEntry
              utilityInfo={{
                pwsid: 'pwsid' in selectedUtility ? selectedUtility.pwsid : selectedUtility.pws_name,
                utilityName: 'utility_name' in selectedUtility ? selectedUtility.utility_name : selectedUtility.pws_name,
                city: 'city' in selectedUtility ? selectedUtility.city : selectedUtility.city_name,
                state: 'state' in selectedUtility ? selectedUtility.state : selectedUtility.state_code
              }}
              errorInfo={manualEntryError}
              onSuccess={handleManualEntrySuccess}
              onCancel={handleManualEntryCancel}
            />
          </div>
        </div>
      )}
    </div>
  )
}
