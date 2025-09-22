import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not initialized' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const pwsid = searchParams.get('pwsid')

    let targetPwsid = 'TN0000511' // Default to Nolensville
    let message = 'Nolensville chlorine data removed from database'

    if (pwsid) {
      targetPwsid = pwsid
      if (pwsid === 'TN0000294') {
        message = 'Hendersonville chlorine data removed from database'
      } else {
        message = `Chlorine data for PWSID ${pwsid} removed from database`
      }
    }

    // Remove data for specified PWSID
    const { data, error } = await supabaseAdmin
      .from('chlorine_data')
      .delete()
      .eq('pwsid', targetPwsid)

    if (error) {
      console.error('Error deleting chlorine data:', error)
      return NextResponse.json({ error: 'Failed to delete chlorine data', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: message,
      deletedCount: data?.length || 0
    })
  } catch (error) {
    console.error('Unexpected error in remove-nolensville-data API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
