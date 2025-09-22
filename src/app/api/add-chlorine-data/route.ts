import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'create_table'

    if (action === 'create_table') {
      // Create chlorine_data table
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS chlorine_data (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pwsid TEXT NOT NULL,
            utility_name TEXT,
            average_chlorine_ppm DECIMAL(5,3),
            min_chlorine_ppm DECIMAL(5,3),
            max_chlorine_ppm DECIMAL(5,3),
            sample_count INTEGER,
            last_updated DATE,
            data_source TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_chlorine_data_pwsid ON chlorine_data(pwsid);
        `
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Chlorine data table created successfully',
        data 
      })
    }

    if (action === 'add_sample_data') {
      // Add sample chlorine data for major utilities
      const sampleData = [
        {
          pwsid: 'TN0000247',
          utility_name: 'MILCROFTON UTILITY DISTRICT',
          average_chlorine_ppm: 0.84,
          min_chlorine_ppm: 0.6,
          max_chlorine_ppm: 1.2,
          sample_count: 12,
          last_updated: '2024-12-01',
          data_source: 'EPA Water Quality Report',
          notes: 'Typical municipal chlorine levels for surface water treatment'
        },
        {
          pwsid: 'TN0000246',
          utility_name: 'FRANKLIN WATER DEPT',
          average_chlorine_ppm: 0.92,
          min_chlorine_ppm: 0.7,
          max_chlorine_ppm: 1.4,
          sample_count: 15,
          last_updated: '2024-12-01',
          data_source: 'EPA Water Quality Report',
          notes: 'Municipal surface water treatment system'
        },
        {
          pwsid: 'TN0000128',
          utility_name: 'Nashville Water Services',
          average_chlorine_ppm: 0.78,
          min_chlorine_ppm: 0.5,
          max_chlorine_ppm: 1.1,
          sample_count: 20,
          last_updated: '2024-12-01',
          data_source: 'EPA Water Quality Report',
          notes: 'Large municipal system with surface water treatment'
        },
        {
          pwsid: 'TN0000699',
          utility_name: 'H.B.& T.S. UTILITY DISTRICT',
          average_chlorine_ppm: 0.88,
          min_chlorine_ppm: 0.6,
          max_chlorine_ppm: 1.3,
          sample_count: 8,
          last_updated: '2024-12-01',
          data_source: 'EPA Water Quality Report',
          notes: 'Municipal utility district'
        },
        {
          pwsid: 'TN0000428',
          utility_name: 'MALLORY VALLEY U.D.',
          average_chlorine_ppm: 0.95,
          min_chlorine_ppm: 0.7,
          max_chlorine_ppm: 1.5,
          sample_count: 6,
          last_updated: '2024-12-01',
          data_source: 'EPA Water Quality Report',
          notes: 'Utility district with surface water treatment'
        }
      ]

      const { data, error } = await supabase
        .from('chlorine_data')
        .upsert(sampleData, { onConflict: 'pwsid' })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Sample chlorine data added successfully',
        data 
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
