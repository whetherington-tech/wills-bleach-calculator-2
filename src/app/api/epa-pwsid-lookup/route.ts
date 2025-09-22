import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zipCode = searchParams.get('zipCode')
    const city = searchParams.get('city')
    const state = searchParams.get('state')

    if (!zipCode && !city) {
      return NextResponse.json({
        success: false,
        error: 'Either zipCode or city parameter is required'
      }, { status: 400 })
    }

    console.log(`🔍 EPA PWSID lookup for zip: ${zipCode}, city: ${city}, state: ${state}`)

    // Build search criteria for EPA water_systems table
    let query = supabase
      .from('water_systems')
      .select('*')
      .eq('pws_activity_code', 'A') // Only active utilities
      .in('pws_type_code', ['CWS']) // Community water systems
      .gte('population_served_count', 1000) // Minimum population
      .order('population_served_count', { ascending: false })

    if (zipCode) {
      query = query.eq('zip_code', zipCode)
    }

    if (city) {
      query = query.ilike('city_name', `%${city}%`)
    }

    if (state) {
      query = query.eq('state_code', state.toUpperCase())
    }

    const { data: epaSystems, error: epaError } = await query.limit(20)

    if (epaError) {
      throw epaError
    }

    // Check which ones already exist in our water_utilities table
    const pwsids = epaSystems?.map(system => system.pwsid) || []
    const { data: existingUtilities } = await supabase
      .from('water_utilities')
      .select('pwsid')
      .in('pwsid', pwsids)

    const existingPwsids = existingUtilities?.map(u => u.pwsid) || []

    // Categorize results
    const newUtilities = epaSystems?.filter(system =>
      !existingPwsids.includes(system.pwsid)
    ) || []

    const existingResults = epaSystems?.filter(system =>
      existingPwsids.includes(system.pwsid)
    ) || []

    return NextResponse.json({
      success: true,
      searchCriteria: { zipCode, city, state },
      totalFound: epaSystems?.length || 0,
      newUtilities: newUtilities.map(system => ({
        pwsid: system.pwsid,
        name: system.pws_name,
        city: system.city_name,
        state: system.state_code,
        population: system.population_served_count,
        connections: system.service_connections_count,
        ownerType: system.owner_type_code,
        sourceType: system.gw_sw_code
      })),
      existingUtilities: existingResults.map(system => ({
        pwsid: system.pwsid,
        name: system.pws_name,
        city: system.city_name,
        state: system.state_code,
        population: system.population_served_count
      })),
      message: `Found ${epaSystems?.length || 0} utilities. ${newUtilities.length} new, ${existingResults.length} already in database.`
    })

  } catch (error) {
    console.error('❌ EPA PWSID lookup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pwsid, autoPopulate = false } = body

    if (!pwsid) {
      return NextResponse.json({
        success: false,
        error: 'PWSID is required'
      }, { status: 400 })
    }

    console.log(`🔧 Auto-populating utility data for PWSID: ${pwsid}`)

    // Get utility data from EPA water_systems table
    const { data: epaSystem, error: epaError } = await supabase
      .from('water_systems')
      .select('*')
      .eq('pwsid', pwsid)
      .single()

    if (epaError || !epaSystem) {
      return NextResponse.json({
        success: false,
        error: `Utility ${pwsid} not found in EPA database`
      }, { status: 404 })
    }

    // Check if already exists in our water_utilities table
    const { data: existingUtility } = await supabase
      .from('water_utilities')
      .select('*')
      .eq('pwsid', pwsid)
      .single()

    if (existingUtility) {
      return NextResponse.json({
        success: true,
        message: 'Utility already exists in database',
        utility: existingUtility,
        skipped: true
      })
    }

    if (!autoPopulate) {
      return NextResponse.json({
        success: true,
        epaData: {
          pwsid: epaSystem.pwsid,
          name: epaSystem.pws_name,
          city: epaSystem.city_name,
          state: epaSystem.state_code,
          population: epaSystem.population_served_count,
          connections: epaSystem.service_connections_count,
          ownerType: epaSystem.owner_type_code,
          sourceType: epaSystem.gw_sw_code,
          zipCode: epaSystem.zip_code
        },
        message: 'EPA data found. Set autoPopulate=true to add to database.'
      })
    }

    // Auto-populate utility in our database
    const newUtility = {
      pwsid: epaSystem.pwsid,
      utility_name: epaSystem.pws_name,
      utility_type: epaSystem.pws_type_code === 'CWS' ? 'Community water system' : 'Water system',
      city: epaSystem.city_name,
      state: epaSystem.state_code,
      population_served: parseInt(epaSystem.population_served_count) || 0,
      service_connections: parseInt(epaSystem.service_connections_count) || 0,
      is_active: epaSystem.pws_activity_code === 'A',
      service_area_description: `Serves ${epaSystem.city_name}, ${epaSystem.state_code} area`,
      water_source: epaSystem.gw_sw_code === 'SW' ? 'Surface water' : 'Groundwater',
      notes: `Auto-populated from EPA database on ${new Date().toISOString().split('T')[0]}`
    }

    const { data: insertedUtility, error: insertError } = await supabase
      .from('water_utilities')
      .insert([newUtility])
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    console.log(`✅ Successfully auto-populated utility: ${epaSystem.pws_name}`)

    return NextResponse.json({
      success: true,
      message: 'Utility successfully auto-populated from EPA data',
      utility: insertedUtility,
      epaSource: epaSystem
    })

  } catch (error) {
    console.error('❌ Auto-populate error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}