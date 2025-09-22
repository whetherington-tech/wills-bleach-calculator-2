import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zipCode = searchParams.get('zip') || '37067'

    const results: any = {
      zipCode,
      timestamp: new Date().toISOString(),
      step1_directSearch: [],
      step2_nearbySearch: [],
      step3_fallbackSearch: [],
      finalResults: [],
      errors: []
    }

    // Step 1: Direct zip code search for municipal systems
    try {
      const { data: municipalSystems, error: municipalError } = await supabase
        .from('water_systems')
        .select('*')
        .eq('zip_code', zipCode)
        .gte('population_served_count', '1000')
        .in('pws_type_code', ['CWS'])
        .in('owner_type_code', ['L', 'M']) // Municipal ownership
        .limit(3)

      if (municipalError) throw municipalError
      results.step1_directSearch = municipalSystems || []
    } catch (err) {
      results.errors.push({ step: 'municipal_search', error: err })
    }

    // Step 2: Nearby zip code search (if no results from step 1)
    if (results.step1_directSearch.length === 0) {
      try {
        const zipPrefix = zipCode.substring(0, 3)
        
        const { data: nearbySystems, error: nearbyError } = await supabase
          .from('water_systems')
          .select('*')
          .like('zip_code', `${zipPrefix}%`)
          .gte('population_served_count', '5000')
          .in('pws_type_code', ['CWS'])
          .in('owner_type_code', ['L', 'M'])
          .limit(3)

        if (nearbyError) throw nearbyError
        results.step2_nearbySearch = nearbySystems || []
        
        // If still no results, try city-based search
        if (results.step2_nearbySearch.length === 0) {
          const { data: cityInfo, error: cityError } = await supabase
            .from('water_systems')
            .select('city_name, state_code')
            .eq('zip_code', zipCode)
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

            if (!cityMunicipalError && cityMunicipal) {
              results.step2_nearbySearch = cityMunicipal
            }
          }
        }
      } catch (err) {
        results.errors.push({ step: 'nearby_search', error: err })
      }
    }

    // Step 3: Fallback search with lower threshold
    if (results.step1_directSearch.length === 0 && results.step2_nearbySearch.length === 0) {
      try {
        const { data: fallbackSystems, error: fallbackError } = await supabase
          .from('water_systems')
          .select('*')
          .eq('zip_code', zipCode)
          .gte('population_served_count', '100')
          .in('pws_type_code', ['CWS'])
          .limit(5)

        if (fallbackError) throw fallbackError
        
        // Sort to prioritize municipal ownership
        if (fallbackSystems) {
          fallbackSystems.sort((a, b) => {
            const aIsMunicipal = ['L', 'M'].includes(a.owner_type_code)
            const bIsMunicipal = ['L', 'M'].includes(b.owner_type_code)
            
            if (aIsMunicipal && !bIsMunicipal) return -1
            if (!aIsMunicipal && bIsMunicipal) return 1
            
            return parseInt(b.population_served_count || '0') - parseInt(a.population_served_count || '0')
          })
        }
        
        results.step3_fallbackSearch = fallbackSystems || []
      } catch (err) {
        results.errors.push({ step: 'fallback_search', error: err })
      }
    }

    // Combine all results
    results.finalResults = [
      ...results.step1_directSearch,
      ...results.step2_nearbySearch,
      ...results.step3_fallbackSearch
    ]

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
