import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zipCode = searchParams.get('zip') || '37203'

    const results: any = {
      zipCode,
      timestamp: new Date().toISOString(),
      utilities: [],
      errors: []
    }

    // Test the filtering logic
    try {
      // First, try to find in zip_code_mapping table
      const { data: zipMappings, error: zipError } = await supabase
        .from('zip_code_mapping')
        .select('*')
        .eq('zip_code', zipCode)

      if (zipError) throw zipError

      let utilities: any[] = []

      if (zipMappings && zipMappings.length > 0) {
        const pwsids = zipMappings.map(mapping => mapping.pwsid)
        
        // Get custom utilities
        const { data: customUtilities, error: customError } = await supabase
          .from('water_utilities')
          .select('*')
          .in('pwsid', pwsids)

        if (customError) throw customError
        if (customUtilities) utilities.push(...customUtilities)

        // Get municipal systems only
        const { data: systemUtilities, error: systemError } = await supabase
          .from('water_systems')
          .select('*')
          .in('pwsid', pwsids)
          .gte('population_served_count', '1000')
          .in('pws_type_code', ['CWS'])
          .limit(5)

        if (systemError) throw systemError
        if (systemUtilities) utilities.push(...systemUtilities)
      } else {
        // Direct search with filtering
        const { data: directSystems, error: directError } = await supabase
          .from('water_systems')
          .select('*')
          .eq('zip_code', zipCode)
          .gte('population_served_count', '1000')
          .in('pws_type_code', ['CWS'])
          .limit(5)

        if (directError) throw directError
        if (directSystems) utilities.push(...directSystems)
      }

      results.utilities = utilities

    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
