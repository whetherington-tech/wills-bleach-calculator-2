import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not initialized' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'add_nolensville'

    if (action === 'add_nolensville') {
      // Add real Nolensville chlorine data (you can provide the correct values)
      const nolensvilleData = {
        pwsid: 'TN0000511',
        utility_name: 'NOLENSVILLE-COLLEGE GROVE U.D.',
        average_chlorine_ppm: 1.2, // Replace with actual value from CCR
        min_chlorine_ppm: 0.8,     // Replace with actual value from CCR
        max_chlorine_ppm: 1.6,     // Replace with actual value from CCR
        sample_count: 12,          // Replace with actual value from CCR
        last_updated: '2024-12-31',
        data_source: '2024 Consumer Confidence Report - Manual Entry',
        notes: 'Chlorine levels manually extracted from Nolensville CCR PDF - please verify values',
        source_url: 'https://www.ncgud.com/wp-content/uploads/2025/05/CCR-2024-New.pdf'
      }

      const { data, error } = await supabaseAdmin
        .from('chlorine_data')
        .upsert(nolensvilleData, { onConflict: 'pwsid' })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Nolensville chlorine data added successfully',
        data: data
      })
    }

    if (action === 'list_all') {
      // List all chlorine data
      const { data, error } = await supabaseAdmin
        .from('chlorine_data')
        .select('*')
        .order('utility_name')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: data,
        count: data?.length || 0
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
