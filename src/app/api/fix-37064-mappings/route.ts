import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing zip code 37064 mappings...')

    // Check existing mappings for 37064
    const { data: existingMappings, error: checkError } = await supabase
      .from('zip_code_mapping')
      .select('*')
      .eq('zip_code', '37064')

    if (checkError) {
      throw checkError
    }

    console.log('📍 Existing mappings for 37064:', existingMappings)

    // Get all Franklin area utilities
    const { data: franklinUtilities, error: utilitiesError } = await supabase
      .from('water_utilities')
      .select('*')
      .in('pwsid', ['TN0000247', 'TN0000345', 'TN0000125']) // Milcrofton, H.B.&T.S., Franklin Water
      .eq('is_active', true)

    if (utilitiesError) {
      throw utilitiesError
    }

    console.log('🏢 Franklin area utilities found:', franklinUtilities.map(u => ({ pwsid: u.pwsid, name: u.utility_name })))

    // Define correct mappings for 37064
    const correctMappings = [
      { zip_code: '37064', pwsid: 'TN0000247', is_primary: true },  // Milcrofton
      { zip_code: '37064', pwsid: 'TN0000345', is_primary: true },  // H.B. & T.S.
      { zip_code: '37064', pwsid: 'TN0000125', is_primary: false }  // Franklin Water Dept (secondary)
    ]

    // Find existing PWS IDs for this zip
    const existingPwsids = existingMappings?.map(m => m.pwsid) || []

    // Add missing mappings
    const newMappings = correctMappings.filter(mapping =>
      !existingPwsids.includes(mapping.pwsid) &&
      franklinUtilities.some(u => u.pwsid === mapping.pwsid)
    )

    let addedMappings = []
    if (newMappings.length > 0) {
      const { data: insertedMappings, error: insertError } = await supabase
        .from('zip_code_mapping')
        .insert(newMappings)
        .select()

      if (insertError) {
        throw insertError
      }

      addedMappings = insertedMappings || []
      console.log(`✅ Added ${addedMappings.length} new mappings for 37064`)
    }

    // Test the lookup after fix
    const { data: testResults, error: testError } = await supabase
      .from('zip_code_mapping')
      .select(`
        *,
        water_utilities (
          pwsid,
          utility_name,
          city,
          state,
          population_served
        )
      `)
      .eq('zip_code', '37064')

    if (testError) {
      console.error('Test lookup error:', testError)
    }

    return NextResponse.json({
      success: true,
      zipCode: '37064',
      existingMappings: existingMappings || [],
      franklinUtilities: franklinUtilities.map(u => ({ pwsid: u.pwsid, name: u.utility_name })),
      addedMappings: addedMappings,
      testResults: testResults || [],
      message: `Fixed 37064 mappings. Added ${addedMappings.length} new mappings.`
    })

  } catch (error) {
    console.error('❌ Error fixing 37064 mappings:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}