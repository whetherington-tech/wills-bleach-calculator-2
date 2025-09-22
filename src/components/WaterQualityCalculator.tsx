'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WaterUtility, WaterSystem, ZipCodeMapping, CalculationResult } from '@/types/database'
import { Droplets, Calculator, AlertTriangle, CheckCircle } from 'lucide-react'

export default function WaterQualityCalculator() {
  const [zipCode, setZipCode] = useState('')
  const [glassesPerDay, setGlassesPerDay] = useState(8)
  const [availableUtilities, setAvailableUtilities] = useState<(WaterUtility | WaterSystem)[]>([])
  const [selectedUtility, setSelectedUtility] = useState<WaterUtility | WaterSystem | null>(null)
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch utilities based on zip code using your actual database structure
  const fetchUtilitiesByZipCode = async (zip: string) => {
    if (zip.length < 5) return

    setLoading(true)
    setError('')
    
    try {
      // First, try to find in zip_code_mapping table
      const { data: zipMappings, error: zipError } = await supabase
        .from('zip_code_mapping')
        .select('*')
        .eq('zip_code', zip)

      if (zipError) throw zipError

      let utilities: (WaterUtility | WaterSystem)[] = []

      if (zipMappings && zipMappings.length > 0) {
        // Get utilities from water_utilities table using PWSID
        const pwsids = zipMappings.map(mapping => mapping.pwsid)
        
        const { data: customUtilities, error: customError } = await supabase
          .from('water_utilities')
          .select('*')
          .in('pwsid', pwsids)

        if (customError) throw customError
        if (customUtilities) utilities.push(...customUtilities)

        // Also get from water_systems table, but filter for municipal utilities only
        const { data: systemUtilities, error: systemError } = await supabase
          .from('water_systems')
          .select('*')
          .in('pwsid', pwsids)
          .gte('population_served_count', '1000') // Only systems serving 1000+ people
          .in('pws_type_code', ['CWS']) // Only Community Water Systems
          .limit(5)

        if (systemError) throw systemError
        if (systemUtilities) utilities.push(...systemUtilities)
      } else {
        // If no mapping found, try direct zip code search in water_systems
        // First, try to find municipal systems in the exact zip code
        const { data: municipalSystems, error: municipalError } = await supabase
          .from('water_systems')
          .select('*')
          .eq('zip_code', zip)
          .gte('population_served_count', '1000')
          .in('pws_type_code', ['CWS'])
          .in('owner_type_code', ['L', 'M']) // Municipal ownership
          .limit(3)

        if (municipalError) throw municipalError
        if (municipalSystems && municipalSystems.length > 0) {
          utilities.push(...municipalSystems)
        } else {
          // If no municipal systems in exact zip, try nearby zip codes for municipal systems
          const zipPrefix = zip.substring(0, 3)
          
          const { data: nearbyMunicipal, error: nearbyError } = await supabase
            .from('water_systems')
            .select('*')
            .like('zip_code', `${zipPrefix}%`)
            .gte('population_served_count', '5000')
            .in('pws_type_code', ['CWS'])
            .in('owner_type_code', ['L', 'M'])
            .limit(3)

          if (!nearbyError && nearbyMunicipal && nearbyMunicipal.length > 0) {
            utilities.push(...nearbyMunicipal)
          } else {
            // Try to find municipal systems in the same city (for cases like Franklin, TN)
            // First get the city name from any system in the zip code
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
                .gte('population_served_count', '5000')
                .in('pws_type_code', ['CWS'])
                .in('owner_type_code', ['L', 'M'])
                .limit(3)

              if (!cityMunicipalError && cityMunicipal && cityMunicipal.length > 0) {
                utilities.push(...cityMunicipal)
              }
            }
          }
          
          if (utilities.length === 0) {
            // Last resort: any systems in the exact zip code, but prioritize municipal
            const { data: anySystems, error: anyError } = await supabase
              .from('water_systems')
              .select('*')
              .eq('zip_code', zip)
              .gte('population_served_count', '1000')
              .in('pws_type_code', ['CWS'])
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
      }

      // Sort utilities to prioritize municipal systems and larger populations
      utilities.sort((a, b) => {
        // Prioritize custom water_utilities first
        if ('utility_name' in a && !('utility_name' in b)) return -1
        if (!('utility_name' in a) && 'utility_name' in b) return 1
        
        // Then by population served (larger first)
        const aPop = 'population_served' in a ? a.population_served : parseInt(a.population_served_count || '0')
        const bPop = 'population_served' in b ? b.population_served : parseInt(b.population_served_count || '0')
        return bPop - aPop
      })

      setAvailableUtilities(utilities)
      if (utilities.length > 0) {
        setSelectedUtility(utilities[0])
      } else {
        // If no large municipal systems found, try with lower population threshold
        // But prioritize municipal ownership over private systems
        const { data: fallbackSystems, error: fallbackError } = await supabase
          .from('water_systems')
          .select('*')
          .eq('zip_code', zip)
          .gte('population_served_count', '100') // Lower threshold
          .in('pws_type_code', ['CWS']) // Still only Community Water Systems
          .limit(5)

        if (!fallbackError && fallbackSystems && fallbackSystems.length > 0) {
          // Sort fallback systems to prioritize municipal ownership
          fallbackSystems.sort((a, b) => {
            // Prioritize municipal (L, M) over private (P)
            const aIsMunicipal = ['L', 'M'].includes(a.owner_type_code)
            const bIsMunicipal = ['L', 'M'].includes(b.owner_type_code)
            
            if (aIsMunicipal && !bIsMunicipal) return -1
            if (!aIsMunicipal && bIsMunicipal) return 1
            
            // Then by population
            return parseInt(b.population_served_count || '0') - parseInt(a.population_served_count || '0')
          })
          
          utilities.push(...fallbackSystems)
          setAvailableUtilities(utilities)
          setSelectedUtility(utilities[0])
        } else {
          setSelectedUtility(null)
          setError('No municipal water utility found for this zip code. Try a different zip code or contact your local water department.')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Error fetching water utilities: ${errorMessage}`)
      console.error('Detailed error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate chlorine consumption
  const calculateChlorineConsumption = async () => {
    if (!selectedUtility || glassesPerDay <= 0) return

    try {
      // For now, we'll use a default chlorine level since we don't have specific chlorine data
      // In a real implementation, you'd fetch this from lcr_samples or another table
      const defaultChlorineLevel = 2.0 // ppm - typical municipal water chlorine level
      
      const chlorinePerGlass = defaultChlorineLevel * 0.000001 // Convert ppm to grams per ml
      const chlorinePerYear = chlorinePerGlass * glassesPerDay * 365 * 240 // 240ml per glass
      const bleachEquivalent = chlorinePerYear / 0.05 // Standard bleach is ~5% chlorine

      setCalculationResult({
        glassesPerDay,
        chlorinePerGlass,
        chlorinePerYear,
        bleachEquivalent,
        utility: selectedUtility,
        zipCode
      })
    } catch (err) {
      console.error('Error calculating chlorine consumption:', err)
    }
  }

  // Handle zip code changes
  useEffect(() => {
    if (zipCode.length === 5) {
      fetchUtilitiesByZipCode(zipCode)
    } else {
      setAvailableUtilities([])
      setSelectedUtility(null)
      setCalculationResult(null)
    }
  }, [zipCode])

  // Recalculate when inputs change
  useEffect(() => {
    if (selectedUtility && glassesPerDay > 0) {
      calculateChlorineConsumption()
    }
  }, [selectedUtility, glassesPerDay])

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Water Quality Calculator
        </h1>
        <p className="text-lg text-gray-600">
          Discover how much chlorine you're drinking and get better water quality
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Your Zip Code
            </label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="12345"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={5}
            />
            {loading && <p className="text-sm text-blue-600 mt-1">Finding utilities...</p>}
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>

          {availableUtilities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Water Utility
              </label>
              <select
                value={selectedUtility?.pwsid || ''}
                onChange={(e) => {
                  const utility = availableUtilities.find(u => u.pwsid === e.target.value)
                  setSelectedUtility(utility || null)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a utility</option>
                {availableUtilities.map((utility) => {
                  const name = 'utility_name' in utility ? utility.utility_name : utility.pws_name
                  const location = 'city' in utility ? `${utility.city}, ${utility.state}` : `${utility.city_name}, ${utility.state_code}`
                  const population = 'population_served' in utility ? utility.population_served : parseInt(utility.population_served_count || '0')
                  const systemType = 'utility_type' in utility ? utility.utility_type : 'Municipal Water System'
                  
                  return (
                    <option key={utility.pwsid} value={utility.pwsid}>
                      {name} ({location}) - {population.toLocaleString()} served
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {selectedUtility && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Glasses of Water Per Day
              </label>
              <input
                type="number"
                value={glassesPerDay}
                onChange={(e) => setGlassesPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="50"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Average glass size: 8 oz (240ml)
              </p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {calculationResult && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
                  <h3 className="text-xl font-semibold text-red-800">
                    Your Annual Chlorine Intake
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Chlorine per year:</span>
                    <span className="font-semibold">
                      {(calculationResult.chlorinePerYear * 1000).toFixed(2)} mg
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-700">Bleach equivalent:</span>
                    <span className="font-semibold text-red-600">
                      {(calculationResult.bleachEquivalent * 1000).toFixed(1)} ml
                    </span>
                  </div>
                  
                  <div className="text-center mt-4">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      {(calculationResult.bleachEquivalent * 1000 / 250).toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">
                      glasses of bleach per year
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Droplets className="h-8 w-8 text-blue-600 mr-3" />
                  <h3 className="text-xl font-semibold text-blue-800">
                    Your Water Source
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Utility:</span>
                    <span className="font-semibold">
                      {'utility_name' in calculationResult.utility 
                        ? calculationResult.utility.utility_name 
                        : calculationResult.utility.pws_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Location:</span>
                    <span className="font-semibold">
                      {'city' in calculationResult.utility 
                        ? `${calculationResult.utility.city}, ${calculationResult.utility.state}`
                        : `${calculationResult.utility.city_name}, ${calculationResult.utility.state_code}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Population served:</span>
                    <span className="font-semibold">
                      {'population_served' in calculationResult.utility 
                        ? calculationResult.utility.population_served.toLocaleString()
                        : parseInt(calculationResult.utility.population_served_count || '0').toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Chlorine level:</span>
                    <span className="font-semibold">2.0 ppm (estimated)</span>
                  </div>
                </div>
              </div>

              {/* Iclosed Integration Button */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Get Better Water Quality
                </h3>
                <p className="text-gray-600 mb-4">
                  Stop drinking chlorine and get pure, clean water for your family
                </p>
                <button
                  onClick={() => {
                    // This will be replaced with actual Iclosed integration
                    alert('Iclosed form will open here')
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Book a Free Water Quality Consultation
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
