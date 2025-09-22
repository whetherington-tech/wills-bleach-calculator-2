import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Removing duplicate Franklin utility entry...')

    // Check the duplicate entry in water_utilities table
    const { data: duplicateEntry, error: checkError } = await supabase
      .from('water_utilities')
      .select('*')
      .eq('pwsid', 'TN0000125')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    console.log('📍 Duplicate entry to remove:', duplicateEntry)

    // Remove the duplicate entry from water_utilities table
    if (duplicateEntry) {
      const { error: deleteError } = await supabase
        .from('water_utilities')
        .delete()
        .eq('pwsid', 'TN0000125')

      if (deleteError) {
        throw deleteError
      }

      console.log('✅ Removed duplicate Franklin entry from water_utilities table')
    }

    // Also ensure no chlorine data remains for TN0000125
    const { error: deleteChlorineError } = await supabase
      .from('chlorine_data')
      .delete()
      .eq('pwsid', 'TN0000125')

    if (deleteChlorineError) {
      console.log('⚠️ Warning: Could not clean chlorine data for TN0000125:', deleteChlorineError)
    } else {
      console.log('✅ Cleaned any remaining chlorine data for TN0000125')
    }

    // Verify TN0000246 still exists in EPA data
    const { data: correctUtility, error: verifyError } = await supabase
      .from('water_systems')
      .select('pwsid, pws_name, city_name, population_served_count')
      .eq('pwsid', 'TN0000246')
      .single()

    if (verifyError) {
      console.error('⚠️ Warning: Could not verify TN0000246 exists:', verifyError)
    } else {
      console.log('✅ Verified correct Franklin utility exists:', correctUtility)
    }

    return NextResponse.json({
      success: true,
      message: 'Removed duplicate Franklin utility entry',
      actions: {
        removedDuplicateUtility: !!duplicateEntry,
        cleanedChlorineData: !deleteChlorineError,
        correctUtilityVerified: !!correctUtility
      },
      note: 'Users should now select "FRANKLIN WATER DEPT" (TN0000246) which has correct chlorine data (1.711 PPM)'
    })

  } catch (error) {
    console.error('❌ Error removing duplicate Franklin entry:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check current state
    const { data: tn125Utility } = await supabase
      .from('water_utilities')
      .select('*')
      .eq('pwsid', 'TN0000125')
      .single()

    const { data: tn246System } = await supabase
      .from('water_systems')
      .select('pwsid, pws_name, city_name, population_served_count')
      .eq('pwsid', 'TN0000246')
      .single()

    const { data: tn246Chlorine } = await supabase
      .from('chlorine_data')
      .select('average_chlorine_ppm, min_chlorine_ppm, max_chlorine_ppm')
      .eq('pwsid', 'TN0000246')
      .single()

    return NextResponse.json({
      success: true,
      status: {
        duplicateInWaterUtilities: !!tn125Utility,
        correctUtilityExists: !!tn246System,
        correctChlorineDataExists: !!tn246Chlorine,
        correctChlorineData: tn246Chlorine ? {
          average: tn246Chlorine.average_chlorine_ppm,
          range: `${tn246Chlorine.min_chlorine_ppm}-${tn246Chlorine.max_chlorine_ppm}`
        } : null
      }
    })

  } catch (error) {
    console.error('❌ Error checking duplicate status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}