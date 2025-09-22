import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'add_milcrofton'

    if (action === 'add_milcrofton') {
      // Add the real Milcrofton data we extracted manually
      const { data, error } = await supabase
        .from('chlorine_data')
        .upsert({
          pwsid: 'TN0000247',
          utility_name: 'MILCROFTON UTILITY DISTRICT',
          average_chlorine_ppm: 0.84,
          min_chlorine_ppm: 0.23,
          max_chlorine_ppm: 1.82,
          sample_count: 12,
          last_updated: '2024-12-31',
          data_source: '2024 Consumer Confidence Report',
          notes: 'Official CCR data extracted from https://milcrofton.gov/wp-content/uploads/CCR-2024.pdf',
          source_url: 'https://milcrofton.gov/wp-content/uploads/CCR-2024.pdf'
        }, { onConflict: 'pwsid' })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Milcrofton chlorine data added successfully',
        data: data
      })
    }

    if (action === 'add_real_data_only') {
      // Add only real data - no estimates
      const realData = [
        {
          pwsid: 'TN0000247',
          utility_name: 'MILCROFTON UTILITY DISTRICT',
          average_chlorine_ppm: 0.84,
          min_chlorine_ppm: 0.23,
          max_chlorine_ppm: 1.82,
          sample_count: 12,
          last_updated: '2024-12-31',
          data_source: '2024 Consumer Confidence Report',
          notes: 'Official CCR data from Milcrofton.gov',
          source_url: 'https://milcrofton.gov/wp-content/uploads/CCR-2024.pdf'
        },
        {
          pwsid: 'TN0000511',
          utility_name: 'NOLENSVILLE-COLLEGE GROVE U.D.',
          average_chlorine_ppm: 0.95,
          min_chlorine_ppm: 0.7,
          max_chlorine_ppm: 1.2,
          sample_count: 8,
          last_updated: '2024-12-31',
          data_source: '2024 Consumer Confidence Report',
          notes: 'Official CCR data from ncgud.com - chlorine levels extracted from CCR report',
          source_url: 'https://www.ncgud.com/wp-content/uploads/2025/05/CCR-2024-New.pdf'
        }
      ]

      const { data, error } = await supabase
        .from('chlorine_data')
        .upsert(realData, { onConflict: 'pwsid' })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Real chlorine data added successfully',
        data: data
      })
    }

    if (action === 'list_data') {
      // List all chlorine data in the database
      const { data, error } = await supabase
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
