import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding H.B. & T.S. Utility District to database...')

    // First, check if H.B. & T.S. Utility District already exists
    const { data: existingUtility, error: checkError } = await supabase
      .from('water_utilities')
      .select('*')
      .eq('pwsid', 'TN0000699')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingUtility) {
      console.log('✅ H.B. & T.S. Utility District already exists')
      return NextResponse.json({
        success: true,
        message: 'H.B. & T.S. Utility District already exists',
        utility: existingUtility
      })
    }

    // Add H.B. & T.S. Utility District
    const hbtsUtility = {
      pwsid: 'TN0000699',
      utility_name: 'H.B. & T.S. Utility District',
      utility_type: 'Utility District',
      city: 'Franklin',
      state: 'Tennessee',
      county: 'Williamson',
      population_served: 24703,
      service_connections: 12000,
      is_active: true,
      zip_codes: ['37064', '37067', '37179'], // Service areas
      service_area_description: 'Hillsboro, Burwood & Thompson\'s Station areas',
      water_source: 'Cumberland River (Cheatham Lake) via Harpeth Valley Utility District',
      established_year: 1968,
      contact_phone: '615-794-7796',
      contact_address: '505 Downs Boulevard, Franklin, TN 37064',
      website: 'https://hbtsud.com',
      notes: 'Non-profit public utility serving Franklin area since 1968'
    }

    const { data: newUtility, error: insertError } = await supabase
      .from('water_utilities')
      .insert([hbtsUtility])
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    console.log('✅ Successfully added H.B. & T.S. Utility District')

    // Now add zip code mappings
    const zipMappings = [
      { zip_code: '37064', pwsid: 'TN0000699', is_primary: true },
      { zip_code: '37067', pwsid: 'TN0000699', is_primary: false },
      { zip_code: '37179', pwsid: 'TN0000699', is_primary: true } // Thompson's Station
    ]

    // Check existing mappings first
    const { data: existingMappings } = await supabase
      .from('zip_code_mapping')
      .select('*')
      .eq('pwsid', 'TN0000699')

    const existingZips = existingMappings?.map(m => m.zip_code) || []
    const newMappings = zipMappings.filter(m => !existingZips.includes(m.zip_code))

    if (newMappings.length > 0) {
      const { error: mappingError } = await supabase
        .from('zip_code_mapping')
        .insert(newMappings)

      if (mappingError) {
        console.error('Error adding zip mappings:', mappingError)
        // Don't fail the whole operation for mapping errors
      } else {
        console.log(`✅ Added ${newMappings.length} zip code mappings`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added H.B. & T.S. Utility District',
      utility: newUtility,
      zipMappingsAdded: newMappings.length
    })

  } catch (error) {
    console.error('❌ Error adding H.B. & T.S. Utility District:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}