import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing Franklin chlorine data mismatch...')

    // First, check the current incorrect data for TN0000125
    const { data: incorrectData, error: checkError } = await supabase
      .from('chlorine_data')
      .select('*')
      .eq('pwsid', 'TN0000125')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    console.log('📍 Current incorrect data for TN0000125:', incorrectData)

    // Delete the incorrect data for TN0000125 (Franklin Michigan data mistakenly assigned to Franklin TN)
    if (incorrectData) {
      const { error: deleteError } = await supabase
        .from('chlorine_data')
        .delete()
        .eq('pwsid', 'TN0000125')

      if (deleteError) {
        throw deleteError
      }

      console.log('✅ Deleted incorrect chlorine data for TN0000125')
    }

    // Verify the correct data for TN0000246 still exists
    const { data: correctData, error: correctError } = await supabase
      .from('chlorine_data')
      .select('*')
      .eq('pwsid', 'TN0000246')
      .single()

    if (correctError) {
      console.error('⚠️ Warning: No correct data found for TN0000246:', correctError)
    } else {
      console.log('✅ Correct data verified for TN0000246:', {
        pwsid: correctData.pwsid,
        average: correctData.average_chlorine_ppm,
        range: `${correctData.min_chlorine_ppm}-${correctData.max_chlorine_ppm}`,
        source: correctData.data_source
      })
    }

    // Optionally copy the correct data to TN0000125 if needed
    if (correctData && !incorrectData) {
      console.log('ℹ️ TN0000125 already clean, no action needed')
    } else if (correctData) {
      console.log('ℹ️ Removed incorrect data. TN0000125 will now fall back to TN0000246 or show no data.')
    }

    return NextResponse.json({
      success: true,
      message: 'Fixed Franklin chlorine data mismatch',
      actions: {
        deletedIncorrectData: !!incorrectData,
        incorrectDataSource: incorrectData?.source_url || 'none',
        correctDataAvailable: !!correctData,
        correctDataValues: correctData ? {
          average: correctData.average_chlorine_ppm,
          range: `${correctData.min_chlorine_ppm}-${correctData.max_chlorine_ppm}`,
          source: correctData.data_source
        } : null
      }
    })

  } catch (error) {
    console.error('❌ Error fixing Franklin chlorine data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get status of both Franklin records
    const { data: tn125Data } = await supabase
      .from('chlorine_data')
      .select('*')
      .eq('pwsid', 'TN0000125')
      .single()

    const { data: tn246Data } = await supabase
      .from('chlorine_data')
      .select('*')
      .eq('pwsid', 'TN0000246')
      .single()

    return NextResponse.json({
      success: true,
      status: {
        TN0000125: {
          hasData: !!tn125Data,
          data: tn125Data ? {
            average: tn125Data.average_chlorine_ppm,
            range: `${tn125Data.min_chlorine_ppm}-${tn125Data.max_chlorine_ppm}`,
            source: tn125Data.data_source,
            url: tn125Data.source_url
          } : null
        },
        TN0000246: {
          hasData: !!tn246Data,
          data: tn246Data ? {
            average: tn246Data.average_chlorine_ppm,
            range: `${tn246Data.min_chlorine_ppm}-${tn246Data.max_chlorine_ppm}`,
            source: tn246Data.data_source,
            url: tn246Data.source_url
          } : null
        }
      }
    })

  } catch (error) {
    console.error('❌ Error checking Franklin data status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}