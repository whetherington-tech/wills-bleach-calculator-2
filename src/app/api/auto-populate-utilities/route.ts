import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { zipCode, dryRun = false } = body

    if (!zipCode) {
      return NextResponse.json({
        success: false,
        error: 'zipCode is required'
      }, { status: 400 })
    }

    console.log(`🚀 Auto-populating utilities for zip code: ${zipCode} (dryRun: ${dryRun})`)

    // Step 1: Check if we already have mappings for this zip code
    const { data: existingMappings, error: mappingError } = await supabase
      .from('zip_code_mapping')
      .select('*')
      .eq('zip_code', zipCode)

    if (mappingError) {
      throw mappingError
    }

    if (existingMappings && existingMappings.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Zip code ${zipCode} already has ${existingMappings.length} utility mappings`,
        existingMappings: existingMappings,
        skipped: true
      })
    }

    // Step 2: Search EPA database for utilities serving this zip code
    const { data: epaUtilities, error: epaError } = await supabase
      .from('water_systems')
      .select('*')
      .eq('zip_code', zipCode)
      .eq('pws_activity_code', 'A') // Only active utilities
      .in('pws_type_code', ['CWS']) // Community water systems
      .gte('population_served_count', 1000) // Minimum population
      .order('population_served_count', { ascending: false })

    if (epaError) {
      throw epaError
    }

    if (!epaUtilities || epaUtilities.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No EPA utilities found for zip code ${zipCode}`,
        zipCode,
        foundUtilities: 0
      })
    }

    console.log(`📍 Found ${epaUtilities.length} EPA utilities for ${zipCode}:`,
      epaUtilities.map(u => ({ pwsid: u.pwsid, name: u.pws_name })))

    // Step 3: Check which utilities already exist in our water_utilities table
    const pwsids = epaUtilities.map(u => u.pwsid)
    const { data: existingUtilities } = await supabase
      .from('water_utilities')
      .select('pwsid, utility_name')
      .in('pwsid', pwsids)

    const existingPwsids = existingUtilities?.map(u => u.pwsid) || []
    const newUtilities = epaUtilities.filter(u => !existingPwsids.includes(u.pwsid))

    console.log(`🔍 ${existingPwsids.length} utilities already exist, ${newUtilities.length} need to be added`)

    let addedUtilities: any[] = []
    let addedMappings: any[] = []

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        zipCode,
        foundEpaUtilities: epaUtilities.length,
        existingInDatabase: existingPwsids.length,
        wouldAdd: newUtilities.length,
        epaUtilities: epaUtilities.map(u => ({
          pwsid: u.pwsid,
          name: u.pws_name,
          city: u.city_name,
          population: u.population_served_count,
          alreadyExists: existingPwsids.includes(u.pwsid)
        })),
        message: `DRY RUN: Would add ${newUtilities.length} new utilities and create ${epaUtilities.length} zip code mappings`
      })
    }

    // Step 4: Add new utilities to water_utilities table
    if (newUtilities.length > 0) {
      const utilitiesToAdd = newUtilities.map(epaUtility => ({
        pwsid: epaUtility.pwsid,
        utility_name: epaUtility.pws_name,
        utility_type: 'Community water system',
        city: epaUtility.city_name,
        state: epaUtility.state_code,
        population_served: parseInt(epaUtility.population_served_count) || 0,
        service_connections: parseInt(epaUtility.service_connections_count) || 0,
        is_active: epaUtility.pws_activity_code === 'A',
        service_area_description: `Serves ${epaUtility.city_name}, ${epaUtility.state_code} area (zip ${zipCode})`,
        water_source: epaUtility.gw_sw_code === 'SW' ? 'Surface water' : 'Groundwater',
        notes: `Auto-populated from EPA database for zip ${zipCode} on ${new Date().toISOString().split('T')[0]}`
      }))

      const { data: insertedUtilities, error: insertError } = await supabase
        .from('water_utilities')
        .insert(utilitiesToAdd)
        .select()

      if (insertError) {
        console.error('Error inserting utilities:', insertError)
        // Continue with mapping creation even if utility insertion fails
      } else {
        addedUtilities = insertedUtilities || []
        console.log(`✅ Added ${addedUtilities.length} new utilities to database`)
      }
    }

    // Step 5: Create zip code mappings for all utilities (existing + new)
    const allRelevantPwsids = epaUtilities.map(u => u.pwsid)
    const mappingsToAdd = allRelevantPwsids.map((pwsid, index) => ({
      zip_code: zipCode,
      pwsid: pwsid,
      is_primary: index < 3 // Mark first 3 as primary (largest by population)
    }))

    // Note: This might fail due to RLS policies, but we'll try anyway
    const { data: insertedMappings, error: mappingInsertError } = await supabase
      .from('zip_code_mapping')
      .insert(mappingsToAdd)
      .select()

    if (mappingInsertError) {
      console.error('⚠️ Error creating zip code mappings (likely RLS policy):', mappingInsertError)
    } else {
      addedMappings = insertedMappings || []
      console.log(`✅ Created ${addedMappings.length} zip code mappings`)
    }

    return NextResponse.json({
      success: true,
      zipCode,
      foundEpaUtilities: epaUtilities.length,
      addedUtilities: addedUtilities.length,
      addedMappings: addedMappings.length,
      utilities: addedUtilities,
      mappings: addedMappings,
      epaSource: epaUtilities.map(u => ({
        pwsid: u.pwsid,
        name: u.pws_name,
        city: u.city_name,
        population: u.population_served_count
      })),
      warnings: mappingInsertError ? ['Failed to create zip code mappings due to database policies'] : [],
      message: `Successfully auto-populated ${addedUtilities.length} utilities and ${addedMappings.length} mappings for zip ${zipCode}`
    })

  } catch (error) {
    console.error('❌ Auto-populate utilities error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check what would be auto-populated
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zipCode = searchParams.get('zipCode')

    if (!zipCode) {
      return NextResponse.json({
        success: false,
        error: 'zipCode parameter is required'
      }, { status: 400 })
    }

    // This is essentially a dry run
    const response = await fetch(`${request.nextUrl.origin}/api/auto-populate-utilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipCode, dryRun: true })
    })

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Auto-populate check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}