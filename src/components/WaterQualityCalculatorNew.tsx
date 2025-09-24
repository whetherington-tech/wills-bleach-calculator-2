'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WaterUtility, WaterSystem, CalculationResult } from '@/types/database'
import { calculateShowerChlorineAbsorption, calculateTotalDailyExposure } from '@/utils/showerChlorineCalculations'
import ResearchLoadingScreen from './ResearchLoadingScreen'
import ManualChlorineEntry from './ManualChlorineEntry'
import ProgressIndicator from './ProgressIndicator'
import ErrorDisplay from './ErrorDisplay'
import LoadingSpinner from './LoadingSpinner'
import ZipCodeInput from './ZipCodeInput'
import UtilitySelector from './UtilitySelector'
import DailyGlassesInput from './DailyGlassesInput'
import ShowerDurationInput from './ShowerDurationInput'
import ResultsDisplay from './ResultsDisplay'

export default function WaterQualityCalculatorNew() {
  const [zipCode, setZipCode] = useState('')
  const [availableUtilities, setAvailableUtilities] = useState<(WaterUtility | WaterSystem)[]>([])
  const [selectedUtility, setSelectedUtility] = useState<WaterUtility | WaterSystem | null>(null)
  const [dailyGlasses, setDailyGlasses] = useState(8)
  const [showerMinutes, setShowerMinutes] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [utilityChlorineData, setUtilityChlorineData] = useState<any>(null)
  const [isResearching, setIsResearching] = useState(false)
  const [researchProgress, setResearchProgress] = useState('')
  const [currentStep, setCurrentStep] = useState<'zip' | 'utility' | 'glasses' | 'shower' | 'loading' | 'results'>('zip')
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

  const handleGlassesNext = () => {
    setCurrentStep('shower')
  }

  const handleShowerSelected = (minutes: number) => {
    setShowerMinutes(minutes)
  }
  

  const fetchUtilitiesByZipCode = async (zip: string) => {
    setLoading(true)
    setError('')
    setAvailableUtilities([])
    setSelectedUtility(null)

    try {
      let utilities: (WaterUtility | WaterSystem)[] = []

      // Geographic-specific utility lookup based on zip code location
      const zipCodeUtilityMap: Record<string, string[]> = {
        // Nashville (Davidson County) - Metro Water Services only
        '37203': ['metro water services'],
        '37215': ['metro water services'],
        '37204': ['metro water services'],
        '37205': ['metro water services'],
        '37206': ['metro water services'],
        '37207': ['metro water services'],
        '37208': ['metro water services'],
        '37209': ['metro water services'],
        '37210': ['metro water services'],
        '37211': ['metro water services'],
        '37212': ['metro water services'],
        '37213': ['metro water services'],
        '37214': ['metro water services'],
        '37216': ['metro water services'],
        '37217': ['metro water services'],
        '37218': ['metro water services'],
        '37219': ['metro water services'],
        '37220': ['metro water services'],
        '37221': ['metro water services'],
        '37228': ['metro water services'],
        '37240': ['metro water services'],

        // Franklin area (Williamson County)
        '37067': ['milcrofton', 'franklin', 'h.b.', 'hbts'],
        '37064': ['franklin', 'h.b.', 'hbts', 'milcrofton'],
        '37069': ['franklin', 'h.b.', 'hbts'], // Franklin

        // Brentwood (Williamson County)
        '37027': ['brentwood', 'harpeth valley', 'mallory valley'],

        // Thompson's Station (Williamson County)
        '37179': ['h.b.', 'hbts'], // H.B.&T.S. serves Thompson's Station

        // Rutherford County
        '37014': ['consolidated utility district', 'rutherford'], // Antioch/CUDRC

        // Other Williamson County areas
        '37135': ['nolensville', 'college grove'], // Nolensville-College Grove U.D.
        '37046': ['nolensville', 'college grove'], // College Grove/Nolensville area
      }

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

      // Step 1: Try to find municipal systems in the exact zip code with geographic filtering
      const { data: municipalSystems, error: municipalError } = await supabase
        .from('water_systems')
        .select('*')
        .eq('zip_code', zip)
        .gte('population_served_count', '1000')
        .in('pws_type_code', ['CWS'])
        .in('owner_type_code', ['L', 'M']) // Municipal ownership
        .eq('pws_activity_code', 'A') // Only active utilities
        .limit(5)

      if (!municipalError && municipalSystems && municipalSystems.length > 0) {
        // Apply geographic filtering to prevent wrong utilities
        const allowedUtilities = zipCodeUtilityMap[zip]

        if (allowedUtilities) {
          const relevantMunicipal = municipalSystems.filter(system => {
            const systemName = system.pws_name.toLowerCase()

            // Exclude obviously wrong utilities (like Columbia Power serving Nashville)
            if (systemName.includes('columbia') && !allowedUtilities.includes('columbia')) {
              return false
            }

            // Include if it matches our allowed utilities for this zip
            return allowedUtilities.some(allowed =>
              systemName.includes(allowed) ||
              system.city_name?.toLowerCase().includes(allowed)
            )
          })
          utilities.push(...relevantMunicipal)
        } else {
          // For unmapped zip codes, include all but filter out obvious mismatches
          const filteredMunicipal = municipalSystems.filter(system => {
            const systemName = system.pws_name.toLowerCase()
            // Filter out utilities that are clearly in wrong locations
            return !systemName.includes('columbia power')
          })
          utilities.push(...filteredMunicipal)
        }
      }

      // Step 1.5: Use zip code mapping defined at top of function

      const allowedUtilities = zipCodeUtilityMap[zip]

      if (allowedUtilities) {
        // Get utilities from curated table based on geographic mapping
        const { data: curatedUtilities, error: curatedError } = await supabase
          .from('water_utilities')
          .select('*')
          .eq('is_active', true)

        if (!curatedError && curatedUtilities && curatedUtilities.length > 0) {
          const relevantUtilities = curatedUtilities.filter(utility => {
            const utilityName = utility.utility_name.toLowerCase()
            return allowedUtilities.some(allowed =>
              utilityName.includes(allowed) ||
              (allowed === 'hbts' && (utilityName.includes('h.b.') || utilityName.includes('hb')))
            )
          })
          utilities.push(...relevantUtilities)
        }
      } else {
        // Fallback for zip codes not in our mapping - use original logic but with stricter filtering
        const { data: curatedUtilities, error: curatedError } = await supabase
          .from('water_utilities')
          .select('*')
          .eq('is_active', true)
          .in('city', ['Franklin', 'Nashville', 'Brentwood'])

        if (!curatedError && curatedUtilities && curatedUtilities.length > 0) {
          const relevantUtilities = curatedUtilities.filter(utility => {
            const utilityName = utility.utility_name.toLowerCase()
            return utilityName.includes('milcrofton') ||
                   utilityName.includes('franklin') ||
                   utilityName.includes('h.b.') ||
                   utilityName.includes('hb') ||
                   utilityName.includes('hbts') ||
                   (utilityName.includes('metro') && utilityName.includes('water'))
          })
          utilities.push(...relevantUtilities)
        }
      }

      // Step 2: Also try to find municipal systems in the same city (for additional options)
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

      // Enhanced deduplication with name similarity and data source preference
      const deduplicateUtilities = (utilities: any[]) => {
        // Helper function to normalize utility names for comparison
        const normalizeUtilityName = (name: string) => {
          return name.toLowerCase()
            .replace(/[&\.\-\s]+/g, ' ') // Replace &, ., -, spaces with single space
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\bdept\b/g, 'department') // dept -> department
            .replace(/\bu\.?d\.?\b/g, 'utility district') // u.d. -> utility district
            .replace(/\bh\.?b\.?\s*&?\s*t\.?s\.?\b/g, 'hb ts') // H.B.&T.S. -> hb ts
            .trim()
        }

        // Helper function to check if two utility names represent the same entity
        const areUtilitiesSimilar = (name1: string, name2: string) => {
          const norm1 = normalizeUtilityName(name1)
          const norm2 = normalizeUtilityName(name2)

          // Exact match after normalization
          if (norm1 === norm2) return true

          // Check if one name contains the other (for abbreviations)
          if (norm1.includes(norm2) || norm2.includes(norm1)) return true

          // Special case for Franklin Water variants
          if ((norm1.includes('franklin') && norm1.includes('water')) &&
              (norm2.includes('franklin') && norm2.includes('water'))) return true

          // Special case for H.B.&T.S. variants
          if (norm1.includes('hb ts') && norm2.includes('hb ts')) return true

          return false
        }

        const deduplicatedUtilities = []
        const processedGroups = new Set()

        for (let i = 0; i < utilities.length; i++) {
          if (processedGroups.has(i)) continue

          const currentUtility = utilities[i]
          const currentName = currentUtility.utility_name || currentUtility.pws_name || ''

          // Find all similar utilities
          const similarUtilities = [currentUtility]
          const similarIndices = [i]

          for (let j = i + 1; j < utilities.length; j++) {
            if (processedGroups.has(j)) continue

            const otherUtility = utilities[j]
            const otherName = otherUtility.utility_name || otherUtility.pws_name || ''

            if (areUtilitiesSimilar(currentName, otherName)) {
              similarUtilities.push(otherUtility)
              similarIndices.push(j)
            }
          }

          // Mark all similar utilities as processed
          similarIndices.forEach(idx => processedGroups.add(idx))

          // Choose the best representative from similar utilities
          let bestUtility = similarUtilities[0]

          // Prefer curated utilities (have 'id' field) over EPA data
          const curatedUtilities = similarUtilities.filter(u => 'id' in u)
          if (curatedUtilities.length > 0) {
            bestUtility = curatedUtilities[0]
          }

          // Among curated utilities, prefer the one with the cleanest name
          if (curatedUtilities.length > 1) {
            bestUtility = curatedUtilities.find(u =>
              u.utility_name && !u.utility_name.includes('&') && !u.utility_name.toUpperCase() === u.utility_name
            ) || curatedUtilities[0]
          }

          deduplicatedUtilities.push(bestUtility)
        }

        return deduplicatedUtilities
      }

      // Apply minimal filtering - only check for active utilities and basic validation
      const activeUtilities = utilities.filter((utility, index, self) => {
        // Only active utilities
        const isActive = 'pws_activity_code' in utility ? utility.pws_activity_code === 'A' : true
        if (!isActive) return false

        // Ensure minimum population served for meaningful coverage
        const population = 'population_served' in utility ?
          utility.population_served : parseInt(utility.population_served_count || '0')
        if (population < 100) return false

        // Exclude clearly wrong utilities (e.g., Columbia Power & Water in Nashville)
        const utilityName = (utility.utility_name || utility.pws_name || '').toLowerCase()

        // Only block obviously wrong geographic matches
        if (utilityName.includes('columbia') && utilityName.includes('power') &&
            ['37203', '37215', '37204', '37205', '37206', '37207', '37208', '37209',
             '37210', '37211', '37212', '37213', '37214', '37216', '37217', '37218',
             '37219', '37220', '37221', '37228', '37240'].includes(zip)) {
          return false // Columbia Power & Water should not serve Nashville
        }

        return true
      })

      // Apply enhanced deduplication
      const uniqueUtilities = deduplicateUtilities(activeUtilities)

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

      // Debug logging for zip codes with known issues
      if (['37067', '37215', '37203', '37075'].includes(zip)) {
        console.log(`🔍 DEBUG ${zip} - Deduplication process:`)
        console.log(`  Before filtering: ${utilities.length} utilities`)
        console.log(`  After active filtering: ${activeUtilities.length} utilities`)
        console.log(`  After deduplication: ${uniqueUtilities.length} utilities`)
        uniqueUtilities.forEach((u, i) => {
          console.log(`  ${i + 1}. ${u.utility_name || u.pws_name} (${u.pwsid}) [${('id' in u) ? 'curated' : 'EPA'}]`)
        })
      }

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

  const calculateChlorineConsumption = (utility: WaterUtility | WaterSystem, glasses: number, chlorineData: any, showerMins: number) => {
    // Only calculate if we have real chlorine data
    if (!chlorineData || !chlorineData.averageChlorine) {
      throw new Error('No chlorine data available for this utility')
    }

    const chlorineLevel = chlorineData.averageChlorine;

    // DRINKING WATER CONSTANTS
    const ozToLiters = 0.0295735;
    const daysPerYear = 365;
    const bleachConcentration = 52500; // mg chlorine per liter of bleach
    const litersPerCup = 0.236588;

    // DRINKING WATER CALCULATION
    const dailyWaterLiters = glasses * 16 * ozToLiters;
    const dailyChlorineMg = dailyWaterLiters * chlorineLevel;
    const yearlyChlorineMg = dailyChlorineMg * daysPerYear;
    const bleachLiters = yearlyChlorineMg / bleachConcentration;
    const bleachCups = bleachLiters / litersPerCup;

    // Additional calculations for display
    const chlorinePerGlass = dailyChlorineMg / glasses; // mg per glass
    const chlorinePerYear = yearlyChlorineMg; // mg per year

    // SHOWER CHLORINE CALCULATION
    const showerChlorineData = calculateShowerChlorineAbsorption(showerMins, chlorineLevel);

    // TOTAL DAILY EXPOSURE CALCULATION
    const totalExposure = calculateTotalDailyExposure(dailyChlorineMg, showerChlorineData.totalChlorineAbsorbed);

    return {
      glassesPerDay: glasses,
      chlorinePerGlass: chlorinePerGlass,
      chlorinePerYear: chlorinePerYear,
      bleachEquivalent: bleachCups,
      utility: utility,
      zipCode: zipCode,
      chlorinePPM: chlorineLevel,
      chlorineData: chlorineData,
      showerMinutes: showerMins,
      showerChlorineData: showerChlorineData,
      totalDailyChlorineExposure: totalExposure.totalDailyChlorine,
      totalDailyBleachEquivalent: totalExposure.totalDailyBleachEquivalent
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
          console.log('🔧 Found existing data, skipping loading screen:', existingData)
          // Data exists, skip loading screen and go directly to next step
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
          // No existing data, show loading screen and do research
          console.log('🔧 No existing data, showing loading screen and starting research...')
          setCurrentStep('loading')
          setIsResearching(true)
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
            const calculation = calculateChlorineConsumption(selectedUtility, dailyGlasses, chlorineData, showerMinutes)
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

  const handleZipCodeSubmit = () => {
    if (zipCode.trim()) {
      fetchUtilitiesByZipCode(zipCode.trim())
    }
  }

  const handleNewCalculation = () => {
    setCurrentStep('zip')
    setZipCode('')
    setAvailableUtilities([])
    setSelectedUtility(null)
    setResult(null)
    setUtilityChlorineData(null)
    setError('')
    setDailyGlasses(8)
    setShowerMinutes(10)
  }

  const getErrorSuggestions = () => {
    if (error.includes('zip code')) {
      return [
        'Make sure you entered a valid 5-digit zip code',
        'Try a nearby zip code if yours doesn\'t work',
        'Check if you\'re in a supported area'
      ]
    }
    if (error.includes('utilities')) {
      return [
        'Try expanding your search to nearby areas',
        'Contact us if you believe this is an error',
        'Check with your local water department'
      ]
    }
    return [
      'Check your internet connection',
      'Try refreshing the page',
      'Contact support if the problem persists'
    ]
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="wf-gradient-card wf-card">
          <h1 className="wf-h1 wf-text-gradient mb-8 sm:mb-12 text-center">
            HOW MUCH CHLORINE AM I REALLY DRINKING?
          </h1>
          <p className="wf-body-large text-center mb-8 max-w-3xl mx-auto">
            Discover how much chlorine you consume from your tap water on a yearly basis. Our free calculator uses local water data
            to give you personalized results.<br/><strong>No pressure, no gimmicks, no fine print or obligation.</strong>
          </p>

          {/* Progress Indicator */}
          <ProgressIndicator currentStep={currentStep} />

          <div className="space-y-8">
          {/* Step 1: Zip Code Input */}
          {currentStep === 'zip' && (
            <>
              <ZipCodeInput
                value={zipCode}
                onChange={setZipCode}
                onSubmit={handleZipCodeSubmit}
                loading={loading}
                error={error}
              />
              {/* Trust Line Below Zip Code */}
              <div className="text-center max-w-2xl mx-auto">
                <p className="text-sm text-gray-600">
                  Powered by <strong>EPA data</strong> and <strong>local water reports</strong> •
                  No personal information required
                </p>
              </div>
            </>
          )}

          {/* Step 2: Utility Selection */}
          {currentStep === 'utility' && availableUtilities.length > 0 && (
            <UtilitySelector
              utilities={availableUtilities}
              selectedUtility={selectedUtility}
              onSelect={handleUtilityChange}
              onContinue={handleContinue}
              loading={loading}
            />
          )}

          {/* Step 3: Daily Glasses Input */}
          {currentStep === 'glasses' && selectedUtility && (
            <DailyGlassesInput
              value={dailyGlasses}
              onChange={setDailyGlasses}
              onCalculate={handleGlassesNext}
              loading={loading}
              utilityName={('utility_name' in selectedUtility ? selectedUtility.utility_name : selectedUtility.pws_name) || 'Unknown Utility'}
            />
          )}

          {/* Step 4: Shower Duration Input */}
          {currentStep === 'shower' && selectedUtility && (
            <div className="space-y-6">
              <ShowerDurationInput
                onDurationSelected={handleShowerSelected}
                initialDuration={showerMinutes}
              />
              <div className="text-center">
                <button
                  onClick={handleCalculateResults}
                  disabled={loading}
                  className="wf-button-primary w-full py-4 px-8 text-lg disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      CALCULATING...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-lg">🧪</span>
                      CALCULATE MY TOTAL CHLORINE EXPOSURE
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Loading Step */}
          {currentStep === 'loading' && (
            <div className="flex justify-center">
              <LoadingSpinner
                message="Getting chlorine data and calculating results..."
                size="large"
                showProgress
              />
            </div>
          )}

          {/* Step 4: Results Display */}
          {currentStep === 'results' && result && (
            <ResultsDisplay
              result={result}
              onNewCalculation={handleNewCalculation}
            />
          )}

          {/* Error Display */}
          {error && (
            <ErrorDisplay
              error={error}
              type="error"
              onRetry={() => setError('')}
              suggestions={getErrorSuggestions()}
            />
          )}
          </div>
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
