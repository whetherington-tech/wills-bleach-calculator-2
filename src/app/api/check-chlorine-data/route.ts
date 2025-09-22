import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pwsid = searchParams.get('pwsid') || 'TN0000247'

    const { data, error } = await supabase
      .from('chlorine_data')
      .select('*')
      .eq('pwsid', pwsid)
      .single()

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        pwsid: pwsid,
        found: false
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      pwsid: pwsid,
      found: true,
      data: data
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
