import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Add NOLENSVILLE-COLLEGE GROVE U.D. to the custom water_utilities table
    const { data, error } = await supabase
      .from('water_utilities')
      .upsert({
        pwsid: 'TN0000511',
        utility_name: 'NOLENSVILLE-COLLEGE GROVE U.D.',
        utility_type: 'Community water system',
        city: 'Nolensville',
        state: 'TN',
        county: 'Williamson',
        population_served: 32793,
        service_connections: 11466,
        is_active: true
      }, { onConflict: 'pwsid' })
      .select()
      .single()

    if (error) {
      console.error('Error adding Nolensville utility:', error)
      return NextResponse.json({ 
        error: 'Failed to add Nolensville utility', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Nolensville utility added successfully',
      data: data
    })
  } catch (error) {
    console.error('Unexpected error in add-nolensville-utility API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
