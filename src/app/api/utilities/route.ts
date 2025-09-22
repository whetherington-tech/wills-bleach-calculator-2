import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zipCode = searchParams.get('zip')

    if (!zipCode) {
      return NextResponse.json({ error: 'Zip code is required' }, { status: 400 })
    }

    // First, let's try to get all utilities to see the structure
    const { data: allUtilities, error: allError } = await supabase
      .from('water_utilities')
      .select('*')
      .limit(10)

    if (allError) {
      console.error('Error fetching utilities:', allError)
      return NextResponse.json({ error: 'Database error', details: allError.message }, { status: 500 })
    }

    // Try to find utilities by zip code
    const { data: utilitiesByZip, error: zipError } = await supabase
      .from('water_utilities')
      .select('*')
      .contains('zip_codes', [zipCode])

    return NextResponse.json({
      zipCode,
      allUtilities: allUtilities || [],
      utilitiesByZip: utilitiesByZip || [],
      zipError: zipError?.message || null
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
