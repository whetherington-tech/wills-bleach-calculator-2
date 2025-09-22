import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not initialized' }, { status: 500 })
    }

    // Update Nolensville with the real CCR data you provided
    const { data, error } = await supabaseAdmin
      .from('chlorine_data')
      .upsert({
        pwsid: 'TN0000511',
        utility_name: 'NOLENSVILLE-COLLEGE GROVE U.D.',
        average_chlorine_ppm: 1.63, // Real CCR data
        min_chlorine_ppm: 0.40,     // Real CCR data
        max_chlorine_ppm: 2.30,     // Real CCR data
        sample_count: 12,
        last_updated: '2024-12-31',
        data_source: '2024 Consumer Confidence Report (Real Data)',
        notes: 'Actual chlorine levels from 2024 CCR report. Average: 1.63 ppm, Range: 0.40-2.30 ppm. Last test: 2024.',
        source_url: 'https://www.ncgud.com/wp-content/uploads/2025/05/CCR-2024-New.pdf'
      }, { onConflict: 'pwsid' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Nolensville chlorine data updated with real CCR values',
      data: data
    })

  } catch (error) {
    console.error('Error updating Nolensville data:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
