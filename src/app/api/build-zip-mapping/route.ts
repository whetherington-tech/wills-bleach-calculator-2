import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zipCode = searchParams.get('zip') || '37067'
    const dryRun = searchParams.get('dryRun') === 'true'

    const results: any = {
      zipCode,
      dryRun,
      timestamp: new Date().toISOString(),
      steps: [],
      mappings: [],
      errors: []
    }

    // Step 1: Find all utilities in the water_systems table for this zip code
    const { data: zipUtilities, error: zipError } = await supabase
      .from('water_systems')
      .select('*')
      .eq('zip_code', zipCode)
      .in('pws_type_code', ['CWS']) // Only Community Water Systems
      .order('population_served_count', { ascending: false })

    if (zipError) throw zipError

    results.steps.push({
      step: 'find_utilities_in_zip',
      count: zipUtilities?.length || 0,
      utilities: zipUtilities?.map(u => ({
        pwsid: u.pwsid,
        name: u.pws_name,
        population: u.population_served_count,
        owner: u.owner_type_code,
        type: u.pws_type_code
      })) || []
    })

    // Step 2: Find municipal utilities in the same city
    let cityUtilities: any[] = []
    if (zipUtilities && zipUtilities.length > 0) {
      const cityName = zipUtilities[0].city_name
      const stateCode = zipUtilities[0].state_code

      const { data: cityData, error: cityError } = await supabase
        .from('water_systems')
        .select('*')
        .ilike('city_name', cityName)
        .eq('state_code', stateCode)
        .in('pws_type_code', ['CWS'])
        .in('owner_type_code', ['L', 'M']) // Municipal ownership
        .gte('population_served_count', '1000')
        .order('population_served_count', { ascending: false })

      if (!cityError && cityData) {
        cityUtilities = cityData
      }
    }

    results.steps.push({
      step: 'find_municipal_utilities_in_city',
      count: cityUtilities.length,
      utilities: cityUtilities.map(u => ({
        pwsid: u.pwsid,
        name: u.pws_name,
        population: u.population_served_count,
        owner: u.owner_type_code,
        zip: u.zip_code
      }))
    })

    // Step 3: Create mappings (prioritize municipal utilities)
    const allUtilities = [...(zipUtilities || []), ...cityUtilities]
    const uniqueUtilities = allUtilities.filter((utility, index, self) => 
      index === self.findIndex(u => u.pwsid === utility.pwsid)
    )

    // Sort by priority: municipal first, then by population
    uniqueUtilities.sort((a, b) => {
      const aIsMunicipal = ['L', 'M'].includes(a.owner_type_code)
      const bIsMunicipal = ['L', 'M'].includes(b.owner_type_code)
      
      if (aIsMunicipal && !bIsMunicipal) return -1
      if (!aIsMunicipal && bIsMunicipal) return 1
      
      return parseInt(b.population_served_count || '0') - parseInt(a.population_served_count || '0')
    })

    const mappings = uniqueUtilities.map((utility, index) => ({
      zip_code: zipCode,
      pwsid: utility.pwsid,
      is_primary: index === 0, // First utility is primary
      utility_name: utility.pws_name,
      population_served: utility.population_served_count,
      owner_type: utility.owner_type_code,
      zip_code_found: utility.zip_code
    }))

    results.mappings = mappings

    // Step 4: Insert mappings if not dry run
    if (!dryRun && mappings.length > 0) {
      // First, delete existing mappings for this zip code
      const { error: deleteError } = await supabase
        .from('zip_code_mapping')
        .delete()
        .eq('zip_code', zipCode)

      if (deleteError) {
        results.errors.push({ step: 'delete_existing', error: deleteError.message })
      }

      // Insert new mappings
      const { data: insertData, error: insertError } = await supabase
        .from('zip_code_mapping')
        .insert(mappings.map(m => ({
          zip_code: m.zip_code,
          pwsid: m.pwsid,
          is_primary: m.is_primary
        })))
        .select()

      if (insertError) {
        results.errors.push({ step: 'insert_mappings', error: insertError.message })
      } else {
        results.steps.push({
          step: 'insert_mappings',
          count: insertData?.length || 0,
          success: true
        })
      }
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
