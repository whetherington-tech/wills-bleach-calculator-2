import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      steps: [],
      success: false,
      errors: []
    }

    // Step 1: Add Milcrofton to water_utilities table if it doesn't exist
    const { data: existingUtility, error: checkError } = await supabase
      .from('water_utilities')
      .select('*')
      .eq('pwsid', 'TN0000247')
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      results.errors.push({ step: 'check_existing_utility', error: checkError })
    } else if (!existingUtility) {
      // Add Milcrofton to water_utilities table
      const { error: insertError } = await supabase
        .from('water_utilities')
        .insert({
          pwsid: 'TN0000247',
          utility_name: 'Milcrofton Utility District',
          utility_type: 'Community water system',
          city: 'Franklin',
          state: 'TN',
          county: 'Williamson',
          population_served: 38032,
          service_connections: 13298,
          is_active: true
        })

      if (insertError) {
        results.errors.push({ step: 'insert_utility', error: insertError })
      } else {
        results.steps.push({
          step: 'insert_utility',
          message: 'Added Milcrofton Utility District to water_utilities table',
          success: true
        })
      }
    } else {
      results.steps.push({
        step: 'check_existing_utility',
        message: 'Milcrofton already exists in water_utilities table',
        success: true
      })
    }

    // Step 2: Add zip code mapping for 37067 -> TN0000247
    const { data: existingMapping, error: mappingCheckError } = await supabase
      .from('zip_code_mapping')
      .select('*')
      .eq('zip_code', '37067')
      .eq('pwsid', 'TN0000247')
      .single()

    if (mappingCheckError && mappingCheckError.code !== 'PGRST116') {
      results.errors.push({ step: 'check_existing_mapping', error: mappingCheckError })
    } else if (!existingMapping) {
      // Add zip code mapping
      const { error: mappingInsertError } = await supabase
        .from('zip_code_mapping')
        .insert({
          zip_code: '37067',
          pwsid: 'TN0000247',
          is_primary: true
        })

      if (mappingInsertError) {
        results.errors.push({ step: 'insert_mapping', error: mappingInsertError })
      } else {
        results.steps.push({
          step: 'insert_mapping',
          message: 'Added zip code mapping: 37067 -> TN0000247 (Milcrofton)',
          success: true
        })
      }
    } else {
      results.steps.push({
        step: 'check_existing_mapping',
        message: 'Zip code mapping already exists for 37067 -> TN0000247',
        success: true
      })
    }

    // Step 3: Verify the fix by checking what utilities are now found for 37067
    const { data: testUtilities, error: testError } = await supabase
      .from('zip_code_mapping')
      .select(`
        zip_code,
        pwsid,
        water_utilities (
          utility_name,
          city,
          state,
          population_served,
          is_active
        )
      `)
      .eq('zip_code', '37067')

    if (testError) {
      results.errors.push({ step: 'verify_fix', error: testError })
    } else {
      results.steps.push({
        step: 'verify_fix',
        message: 'Verification complete',
        data: testUtilities,
        success: true
      })
    }

    results.success = results.errors.length === 0

    return NextResponse.json(results, { status: results.success ? 200 : 500 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}